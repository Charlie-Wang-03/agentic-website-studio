<p align="right">
  <a href="./README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <img src="./docs/assets/readme/hero.svg" width="100%" alt="Agentic Website Studio：从参考证据、设计抽象和 Human Gate，到 Wayfinder dogfood 示例的证据优先创意 Web 工作流。">
</p>

# Agentic Website Studio

**一个已经冻结的实验型 Agent toy demo，用来探索证据优先、权利边界感知和人在回路的创意 Web 工作流。**

![Status](https://img.shields.io/badge/status-frozen%20toy%20demo-586069?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

> **当前状态：** 已冻结、实验性质、没有活跃 roadmap。本仓库不是 production-ready 系统，也不是网站克隆器。

Agentic Website Studio 最初围绕一个问题展开：**Agent 能否把公开网站作为参考，同时避免把“研究、解释、原创性和人工判断”混成一个不透明的“生成一个类似网站”步骤？**

这个仓库把这些阶段显式拆开：先获取有边界的证据，再区分观测与推断，抽象可迁移机制，持续携带 rights / anti-copy 约束，并在关键创意决策前设置 Human Gate，让自动化不能自行批准自己的方案。

## 这个项目展示了什么

| 阶段 | 实际展示的能力 |
| --- | --- |
| **参考研究** | 通过受限、被动的浏览器观测获取证据，并保守处理 URL、隐私与权利边界 |
| **设计抽象** | `observed_fact` 与 inference、evaluation、transferable principle 明确分层 |
| **多参考综合** | 可以综合抽象机制，而不把源网站 URL、资产、原文或精确布局直接交给创意生成阶段 |
| **人工控制** | 自动化可以准备并验证 Gate，但不能批准自己的创意方向 |
| **实现与 QA** | 本地确定性测试、Playwright 浏览器 QA、可访问性检查、provenance manifest 与可复现状态 |
| **Dogfood** | Wayfinder / Three Bearings 作为原创项目内示例，完整跑通主要流程 |

这个实验最有价值的结果并不是“第一次就做对”。**机器 QA 已经通过，但人类验收仍然否决了体验。** 这次否决被记录成结构化反馈，触发了一次有边界的修订，而且失败记录本身被保留下来，没有被后来版本改写成“从一开始就成功”。

## 工作流

```text
公开参考网站
      ↓
有边界的 Evidence
      ↓
Reference Profile + Design Principles
      ↓
多参考综合
      ↓
Originality Firewall
      ↓
原创 Creative Concepts
      ↓
HUMAN GATE
      ↓
Implementation Contract
      ↓
可运行实现
      ↓
Automated QA
      ↓
HUMAN EVALUATION
```

更完整的数据模型、provenance 和信任边界见 [架构说明](docs/ARCHITECTURE.zh-CN.md) 与 [策略说明](docs/POLICIES.zh-CN.md)。

## Wayfinder dogfood

**Wayfinder / Three Bearings** 是仓库中保留的原创 dogfood 示例。它是一段通过上述流程生成和反复验收的小型互动旅程，但**不是一个正式发布的产品**。

这个 Pilot 的价值在于，它真实保留了机器判断与人类体验之间的冲突：

```text
机器检查通过
      ↓
人类：这仍然更像 Web demo
      ↓
反馈 artifact + revision contract
      ↓
连续世界的交互修订
      ↓
人类：现在更像一个小型互动作品
```

最终仓库选择在这里冻结，而不是继续无限 polish 或继续扩展第二个 Pilot。

### 运行 Demo

需要 Node.js 24 或更高版本。

```powershell
npm ci
$Env:PLAYWRIGHT_BROWSERS_PATH="0"
npx playwright install chromium
npm run wayfinder:preview
```

Preview 启动后访问 `http://127.0.0.1:4173`，使用 `Ctrl+C` 停止。

运行完整 Wayfinder QA：

```powershell
npm run wayfinder:qa
```

## Research CLI

早期的证据工具仍保留在仓库中，可用于本地实验，但它现在是冻结 Demo 的次要部分：

```powershell
npm run studio -- capture --url https://example.com --project example
npm run studio -- prepare-analysis --run runs/example/<run-id>
npm run studio -- validate-analysis --run runs/example/<run-id> --profile runs/example/<run-id>/reference-profile.json --principles runs/example/<run-id>/design-principles.json
```

生成的 run 只保存在本地，并由 Git 忽略。

## Demo 背后的几个原则

- **Evidence before inference。** 浏览器观测不能直接冒充设计判断。
- **Abstraction before reuse。** 公开可访问不代表源表达可以被复用。
- **Originality before implementation。** 创意 Agent 使用 source-neutral abstraction，而不是直接查看源页面或资产。
- **Machine QA is not human approval。** 能确定性验证的事情交给机器；审美和体验结论仍由人判断。
- **Evidence before self-improvement。** 单个 Pilot 得到的经验只能先作为 candidate rule，不能自动升级成全局规则。

## 文档

| 文档 | 作用 |
| --- | --- |
| [架构说明](docs/ARCHITECTURE.zh-CN.md) · [English](docs/ARCHITECTURE.md) | Evidence 分层、provenance、firewall、Human Gate 与实现边界 |
| [策略说明](docs/POLICIES.zh-CN.md) · [English](docs/POLICIES.md) | 公开参考、rights、隐私、原创性和 artifact 生命周期 |
| [Reference Intelligence Protocol](docs/REFERENCE_INTELLIGENCE_PROTOCOL.md) | 单参考 evidence-only 分析协议 |
| [Creative Protocol](docs/M3_CREATIVE_PROTOCOL.md) | 多参考综合与 Creative Concept 边界 |
| [Wayfinder Project Lessons](docs/WAYFINDER_PROJECT_LESSONS.md) | 有证据支持的项目经验和 Candidate Rules |
| [Third-party materials](THIRD_PARTY.md) | 依赖与参考项目的归属边界 |

机器可读 schema、manifest、Human Gate artifact、QA report 和历史 Pilot 记录保持原始语言和结构，不为展示目的复制翻译版本。

## 状态与限制

**Frozen toy demo. No active roadmap.**

- Wayfinder：已完成的内部 dogfood Pilot。
- 公开源码：按当前状态保留。
- Hosted service：无。
- Deployment：无。
- Pilot 2：未启动。
- 活跃维护承诺：无。

主要限制：

- 没有按 production system 做完整 hardening；
- Agent 隔离主要依赖 protocol / contract，而不是 cryptographic isolation；
- 自动化 metadata 不构成法律意见，也不代表自动完成 rights clearance；
- 浏览器与可访问性测试只是有边界的证据，不是普遍性保证；
- 本项目不声称优于当前原生 Agent 平台。

## Rights 与原创性

**公开可访问不等于获得复用许可。**

参考网站截图和观测到的第三方内容只作为研究证据，不作为可复用资产。派生的 Design Principle 会继续携带 rights caveat 与 anti-copy 约束。这是一套工程 guardrail，并不意味着某个设计只要经过“抽象”就自动获得法律安全性。

## License

项目原创源码采用 [MIT License](LICENSE)。依赖继续遵循各自许可证；公开参考项目仅作为研究 / inspiration 使用，并未作为 vendored source 或 creative asset 纳入仓库。详见 [THIRD_PARTY.md](THIRD_PARTY.md)。

---

<sub>README 展示层采用 <a href="https://github.com/oil-oil/beautify-github-readme">beautify-github-readme</a> 所强调的 project-native、proof-first 方法。</sub>
