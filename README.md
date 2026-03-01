# AI 运营研判中心原型

这是一个基于 React + Vite 的安全运营可视化原型，包含：

- 高危事件队列（状态统计、滚动列表、事件联动）
- 关联分析（攻击者、系统与主机关系、原始流量、设备日志）
- AI 推理实录（打字机输出、攻击路径取证分析、追问对话）
- 报告中心（模板选择/新建、查看编辑保存、下载）

## 技术栈

- React 18
- Vite 5
- Lucide React
- Recharts

## 目录结构

```text
.
├── App.jsx
├── App.css
├── main.jsx
├── index.html
├── components/
├── data/
└── operation-instruction.txt
```

## 环境要求

- Node.js 18+（推荐 20+）
- npm 9+

## 安装与运行

1) 安装依赖

```bash
npm install
```

2) 启动开发环境

```bash
npm run dev -- --host 0.0.0.0 --port 4173
```

3) 浏览器访问

- 本机：`http://localhost:4173`
- 局域网：`http://<你的IP>:4173`

## 构建产物

```bash
npm run build
```

构建结果输出到 `dist/`。

## 常见问题

- 页面空白/样式未更新：先强制刷新（Ctrl+F5）。
- 端口冲突：更换端口启动，如 `npm run dev -- --port 5174`。
- 依赖安装慢：检查网络代理或切换 npm 镜像。

## 说明

- 项目内置了 10+ 条高危事件样例数据与 10+ 条报告样例数据，便于直接演示联动与交互。
- 所有联动逻辑均基于 React `useState` 完成，不依赖后端接口。
