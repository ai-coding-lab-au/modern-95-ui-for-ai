# Modern 95 UI for AI

面向 AI 辅助开发的设计 skill 与轻量 UI Starter：青绿桌面、深蓝标题栏、浅灰工具区、精确对齐和克制的层次。目标是统一、清楚的现代工作界面。

[English](README.md) · [设计规范](references/design-system.md) · [Starter 接入](assets/starter/USAGE.md) · [许可证](LICENSE)

**当前公开预览版：`0.3.0-rc.1`。** GitHub 仓库：[modern-95-ui-for-ai](https://github.com/ai-coding-lab-au/modern-95-ui-for-ai)；技能调用名保持 **`$modern-95-ui`**。

![Starter 状态展示](docs/images/starter-gallery.png)

## 包含内容

- 可供 AI 读取的工作流程、视觉规则和验证要求。
- 有作用域的 HTML/CSS 与少量原生弹窗辅助函数。
- 状态展示、设备清单、服务申请向导三个 Starter 页面。
- Handover 工作台：优先采用的深蓝窗口控制组与灰白双栏结构。
- 数值令牌、MIT 许可、固定版本 Lucide 图标及完整第三方声明。

这是带参考实现的设计 skill。接入时沿用项目框架与业务逻辑。字体默认 Segoe UI，开发者可覆盖；包内不带字体、React95、微软素材或远程运行服务。

## 本机试用

需要 Node.js 22 或更新版本，无需运行 `npm install`：

```sh
git clone https://github.com/ai-coding-lab-au/modern-95-ui-for-ai.git
cd modern-95-ui-for-ai
npm start
```

试用 Handover 时，在仓库根目录改为运行 `npm run start:workbench`。两个服务同时运行时，分别使用一个终端。

Windows 可双击 `assets/starter/Start-Starter.cmd` 或 `assets/design-lab/Start-Preferred-Workbench.cmd`。未自动打开浏览器时，访问终端输出的本地地址；Ctrl+C 停止服务。

Starter 使用端口 55197，Handover 使用 55198。展示页与 Handover 刷新后重置；设备和申请案例把合成记录保存在浏览器本地存储。同一浏览器、profile 和地址才能读取原记录，换端口也会形成独立存储。

![Handover 工作台](docs/images/workbench-wide.png)

Handover 右上角按钮仅操作网页内预览区域；真实桌面产品接入宿主窗口能力。普通网页无需放置系统窗口按钮。

## 作为 Codex skill 使用

把本包完整目录复制到以下一个位置，并把安装目录命名为 `modern-95-ui`：

- 跨项目使用：`~/.agents/skills/modern-95-ui/`
- 单项目使用：`<project>/.agents/skills/modern-95-ui/`

Windows 用户目录对应 `%USERPROFILE%\.agents\skills\modern-95-ui`。复制前检查已有安装并保留本地修改，避免同名 skill 重复安装。目录发现与刷新方式见 [官方文档](https://developers.openai.com/codex/skills)。

```text
使用 $modern-95-ui 精修这个应用。
保留现有框架、数据与业务行为；先完成一条代表性流程，
再检查对齐、交互状态、键盘操作和窄窗口布局。
```

其他 AI 工具按各自加载方式读取 `SKILL.md`，目前未验证其自动发现。可运行案例与接入说明为英文，详细设计规范为中文。

## 接入与反馈

从 [USAGE](assets/starter/USAGE.md) 选择需要的结构与控件。Starter 使用 `.m95` 限定作用域；青绿桌面需显式添加 `.m95-desktop`。开发者可用 `--m95-font` 覆盖字体。输入 `100` 时保持编辑原文，金额显示和计算由业务层负责。

运行 `npm test` 检查分发资产；浏览器检查命令及覆盖范围见 [验证说明](docs/validation.md)。其他电脑和项目可按 [贡献规则](CONTRIBUTING.md) 提交脱敏经验，由维护端审查共享规范的更新。

本包不带历史实验室、私有反馈和旧 Git 历史。[来源说明](docs/source-and-license.md) 列出保留范围。项目代码与文档采用 **MIT**；Lucide 图标保留 ISC 和适用的 Feather MIT 声明。项目与微软无隶属关系。
