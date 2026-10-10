# 测试与守卫

本文是 README 里「验证」一节的完整版：哪些不变量由谁守着、检查在哪一层抓违规、每道守卫如何被证伪过。

## 三条不变量

### 一、动画坐标不写在 CSS 里

偏移量在 `lib/geometry.ts` 中算出，以自定义属性传入；攻击 keyframes 在 `lib/keyframes.ts` 运行时生成。三道检查覆盖这条规则，三者并不等价：

- `keyframes.test.ts` 校验生成器**产出**的值；
- `no-hardcoded-pixels.test.ts` 读样式表**和生成器自己的源码**，`transform` 里出现像素字面量就报错；
- `tools/shoot.mjs` 在真实浏览器里测量渲染结果。

只查值的检查会放过「硬编码但恰好算对」的实现，所以源码级那道必须存在。

源码级检查的范围是刻意划定的：扫描每一条声明（所以藏在自定义属性后面的坐标照样被抓住），认识 3D、matrix 和 perspective 写法 —— 早期版本对这几种形态都漏判过，而测试套件当时还是绿的。它**不**管静态装饰上非 transform 属性（`top`、`left`、`margin`）的像素值，也不管 TSX 里的内联 `style={{}}`。这个范围已经够用，因为阶段卡和攻击动画的坐标系完全建立在 transform 上。

> `frontend/vite.config.ts` 里的 `test: { css: true }` 是**承重配置**。按 Vitest 的默认行为，`?raw` 导入的 CSS 会解析成空字符串，守卫于是什么都没读到、照样通过。删掉它，规则会悄悄失效，而测试一个都不会红。

### 二、第 3、4、5 步共用同一批 DOM 节点

三步只有类名和 transform 输入不同，卡片是在布局之间移动，而不是销毁重建。这一点读源码证明不了，所以 `tools/shoot.mjs` 用实证方式证明：给五个在场节点打标签，布局切换后标签没能存活就报错。

### 三、溯源副本与其源头逐字节核对

`frontend/public/source/` 下的三个文件由 `source-assets.test.ts` 与 `contract/` 逐字节比对，`ClosingNote.tsx` 里若有链接指向未提供的文件也会报错。

## 守卫的证伪记录

每道守卫都注入过一个变异、确认检查真的会红 —— 不会失败的检查比没有检查更糟。其中两道最初就是不会失败的：

| 守卫 | 注入的变异 | 失败信息 |
| --- | --- | --- |
| `source-assets.test.ts` 副本比对 | 给副本末尾追加一个空格 | 指出偏移、两侧字节和两个长度 |
| `source-assets.test.ts` 链接检查 | 把链接目标改名 | 指出缺失文件 |
| 收束注的选择器 | 指向不存在的 `data-testid` | 在 `step5-closing-note` 之前报告 waitFor 超时 |
| VerifyPanel 已部署宣称 | 让宣称不设门 | 套件变红，指出出事的那一行 |

## 验证面板的措辞守卫

「动画背后有链上证据」是全篇最不能说错的一句话，所以它有独立守卫：

- `isDeployed()` 两种状态都有测试，不只是本仓库所处的这一种。
- 有测试扫描 `VerifyPanel.tsx`，「已部署」的措辞一旦出现在 `deployed ?` 分支之外就报错。

`isDeployed()` 从 `config/verification.ts` 的数据推导，不存成标志位；真实值一填进去，面板措辞自己切换。

## `npm test` 覆盖范围

几何计算、步骤状态机、keyframe 生成器、Rust 分词器、验证配置及其已部署/未部署两种状态、「禁止手写坐标」守卫，以及对收束注所链接副本的逐字节溯源核对。

## 截图验证脚本

```bash
npm run dev -- --port 5199 &
node tools/shoot.mjs http://localhost:5199/ .shots-real   # 需要 Node >= 22
```

它通过 DevTools 协议驱动无头 Chrome，点击的是真实元素。每一步都**针对活着的页面断言等待**，而不是睡一个猜出来的时长；每张截图都会记下它实际观察到的步骤和模式 —— 猜时长的 sleep 既产生过误报，也产出过错标的帧。

失败条件：选择器缺失、结果文案不对、阶段卡被重新挂载，或出现任何 console 错误（`Runtime.consoleAPICalled`、`Runtime.exceptionThrown`、`Log.entryAdded`，从页面加载起收集）。

刻意**不用** Chrome 的 `--virtual-time-budget`：它会快进 `setTimeout`，而 CSS 动画仍按真实时钟走，截到的帧和应用自以为的状态对不上。

## 走查录像

```bash
node tools/record.mjs http://localhost:5199/ docs/screenshots/walkthrough.mp4 \
  --fps=30 --width=1920 --height=1080        # 需要 Node >= 22 和 ffmpeg
```

它通过 DevTools 协议截取页面自己的合成器输出 —— 没有窗口边框，没有桌面 —— 并用与截图脚本相同的状态断言驱动流程。帧只在页面重绘时到来，因此会重采样成固定帧率，而不是按到来的原速回放。

当前 `docs/screenshots/walkthrough.mp4` 录制于收束注加入之前，所以录像和 `contact-sheet.png` 展示的流程在第 5 步结尾没有那段注。
