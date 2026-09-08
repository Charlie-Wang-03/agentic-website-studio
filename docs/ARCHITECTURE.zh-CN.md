<p align="right">
  <a href="./ARCHITECTURE.md">English</a> · <strong>简体中文</strong>
</p>

# 架构说明

## 从 Evidence 到决策的分层

```text
公开网站
  → 受策略约束的被动浏览器研究
  → Raw Evidence + 研究截图
  → 确定性的 Analysis Packet
  ───────────── Evidence Firewall ─────────────
  → Reference Profile
  → Design Principles
  → Schema + 语义验证
  ─────── Reference Evidence Firewall ───────
  → source-neutral Synthesis Packet
  → 分类后的 Synthesis Map
  ─────────── Originality Firewall ──────────
  → Creative Packet + 权威 Project Brief
  → 3 个 Creative Concepts
  → 独立评审
  → Human Creative Gate: pending_human_selection
  → 明确的人类 Concept Decision
  → source-neutral Implementation Contract
  → Smallest Playable Slice
  → 确定性的项目原创实现
  → Source Manifest + Automated QA + 独立实现审计
  → Human Playtest Gate: pending_human_playtest
  → Human Feedback: request_revision
  → M4.2R Revision Contract + 连续世界修订
  → 新 Source Manifest + QA + 独立修订审计
  → Human Re-Playtest Gate: pending_human_replaytest
```

`Raw Evidence` 是浏览器或确定性检查得到的原始观测。其 schema 将 `epistemicType` 固定为 `observed_fact`。它可以记录测量到的几何信息或 computed style 的统计，但不能把这些观测直接称为“有效”“美观”“可迁移”或“可复用”。

`Reference Profile` 是单一参考源上的派生解释。每条 claim 必须是 `inference`，或在真正主观时使用 `evaluation`；同时引用 supporting evidence，在存在反例时记录 counter-evidence，说明 confidence，并显式写出限制。

`Design Principle` 是可以用于完全不同原创作品的抽象机制。它引用 profile claim 与 raw evidence，保留来源 rights 信息，并要求机器可读的 anti-copy 约束。它不能携带可复用的源资产、源代码、精确布局或精确 motion sequence。

`Synthesis Map` 不是另一份 Reference Profile。它把跨参考推理分为：收敛规律、互补替代方案、尚未解决的 tension，以及只来自单一参考的 unique candidate。确定性验证负责解析每个 provenance 引用，并阻止“重复同一来源”伪装成共识；语义上是否真的相似，仍然交给独立评审。

`Creative Concept` 也不是 Synthesis Map。它围绕 Project Brief 使用被选中的抽象 synthesis unit，给出原创表达、tradeoff 与 influence 记录。Concept 不能绕过 Synthesis Map，直接引用 raw evidence、profile claim 或 Design Principle。

独立的 diversity / grounding review 与 originality review 都是带版本的 artifact，并绑定精确的 concepts 文件 SHA-256。评审失败会阻止 Gate 创建；warning 会继续流入 Human Creative Gate。这样可以避免 Concept 修改后复用旧的 PASS 结论。

## Human Gate 与实现绑定

M4.1 只能在明确的人类决策之后开始。Human Concept Decision 是新的 provenance artifact，不会回写历史 M3 Gate。它绑定 `projectId`、`synthesisId`、Concept 文件 SHA-256 与选中的 Concept ID，同时继承之前 Gate 的 warning 与 unresolved question。

Implementation Contract 再通过 SHA-256 绑定这次 Human Decision，只把已经选中的 Concept 转换为工程范围。它保留 protected-expression prohibition，定义体验模型、consequence model、明确 non-goal、未来 QA 要求以及最小可玩 Slice 的确定性状态机。

验证会拒绝：过期 M3 hash、不存在的 Concept、被替换或削弱的原创性约束、禁止材料、未知状态、不可达状态，以及重复的 `(state, event)` transition。

Wayfinder 的最初 Slice 故意比完整 Concept 小：arrival / orientation 之后只有一次三选一 bearing；选择产生 route / atmosphere consequence 与短 reflection。三个分支在这个 Slice 内不重新合流，从而可以验证“差异是否可感知”，又不需要立即创建巨大的内容组合树。

M4.2 将 Wayfinder dogfood 隔离在 `pilots/wayfinder/`。浏览器 UI 只向一个纯 transition layer 分发 event；contract-conformance test 会把运行时状态机与 M4.1 JSON 合同进行对比。Vite 只承担 build / preview。Playwright 在本地 production build 上检查分支矩阵、keyboard、模拟 touch、reduced motion、代表性 axe 状态、network isolation、runtime error 与 deterministic replay。

Wayfinder 现已作为 Pilot 1 完成并冻结。之前的 M4.3R Human Expansion Re-Playtest Gate 保持历史上的“未回答”状态；后来的 Pilot Closure artifact 不会把它改写成 approval，也没有授权 release 或 deployment。

## 机器 QA 与人类体验判断

第一次 Human Playtest 否决了已经通过自动 QA 的实现，主要问题包括：decision motivation、consequence perceptibility、felt agency、pacing 与 visual-medium coherence。M4.2R 将人类原话记录为 observation，同时把实现原因单独标为 inference；历史 Gate、manifest、QA report 与 commit 保持不变，新的 revision amendment 只在绑定明确 `request_revision` 后生效。

修订后的运行时保留一个稳定 SVG world shell。Arrival / approach 进入 active survey；ridge、marker、gap 提供可逆的 offer/cost preview；独立 commit 才真正进入改变后的世界；最后在 reflection 之前增加 lived branch beat。世界通过 state attribute 改变持续存在的 landmark，而不是每次替换根场景。

```text
machine validation ≠ human experience judgment
```

机器可以证明 reachability、deterministic behavior、结构性分支差异以及基础 technical accessibility；Choice clarity、felt agency、consequence perceptibility、pacing、visual coherence 与 narrative tone 仍然是 human-only evaluation。

```text
References inform mechanisms.
Project Brief determines purpose.
Human decides creative direction.
Implementation contracts bound the approved direction.
```

## Identity 与 provenance

一个 `Reference` 用确定性的 `ref_<hash>` 标识规范化后的公开最终 URL；一个 `Run` 表示一次带时间戳的 capture。因此：

```text
Run identity ≠ Reference identity
```

不同 Run 中的本地 evidence ID 可以重复，所以 `ev_structure_desktop` 单独出现时并不是全局有效 provenance。派生 artifact 使用 `{ runId, evidenceId }` 复合引用，语义 validator 会回到真实 source run 解析两者，并拒绝 missing、duplicate 或 cross-run reference。

## Capture 责任边界

`src/capture.ts` 负责浏览器生命周期、request policy、artifact assembly 与 manifest。

`src/intelligence.ts` 在固定 viewport 上进行有预算的被动提取，包括：

- semantic section 与 geometry；
- layout count；
- 短 heading / affordance label；
- computed-style distribution；
- animation / transition / media / sticky signal；
- resource summary；
- 三个确定性的 scroll position。

它不会保存 DOM clone，也不会保存完整 stylesheet。

导航使用 `domcontentloaded`、有界 settle、被动检查与有界 scroll sweep，而不是把无限等待 `networkidle` 当作页面 ready。每个 viewport 使用独立、非持久 context，并显式指定尺寸。navigation、settle、node、text、response、warning、screenshot height、scroll position 都有预算上限。

`src/analysis.ts` 会先验证 source run，再把有边界的 observation、rights record、warning 与 screenshot path/hash 组合成确定性的 `analysis-packet.json`。Raw value 在 packet 生成前受到 per-kind allowlist、depth/item/byte budget 与 manifest-backed artifact reference 的限制。

`src/analysis-validation.ts` 则把 JSON Schema 与 run/reference identity、evidence resolution、duplicate ID、source-rights status/basis/notes 的精确保留，以及 anti-copy 检查组合起来。

Schema 和生成 artifact，而不是聊天记录，是 source of truth。M1 run 属于临时数据；M2 contract 修正后，旧 capture 需要重新生成，而不是通过复杂迁移继续使用。

## Firewall 的实际执行方式

M2 Evidence Firewall、M3 Reference Evidence Firewall 与 M3 Originality Firewall 都由 artifact contract + procedural execution protocol 组成。

Synthesis Packet 的 agent-facing projection 只暴露已经验证的 abstraction。Creative Packet 进一步移除：

- URL 与 source name；
- screenshot；
- raw evidence；
- profile/principle ID；
- source prose / asset / code；
- geometry；
- exact motion。

本仓库不会声称自己可以从任意模型运行时中通过密码学方式移除工具权限，所以 artifact 会诚实记录 enforcement 只是 `protocol`。

M3 结束在 `pending_human_selection` 的 Human Creative Gate；自动化不能产生 approval。M4.1 记录人类选择，M4.2 停在 `pending_human_playtest`。即使 machine QA 全绿，人类仍然可以拒绝。M4.2R 只接受已绑定的 `request_revision`，保留失败实验，并停在 `pending_human_replaytest`。M4.3R 同样保留一个未回答的 `pending_human_expansion_replaytest`。

后续 `close_pilot` 决策只是结束 Wayfinder internal dogfood，并不是 release approval，也不是说那些未回答问题自动通过。[Wayfinder Project Lessons](WAYFINDER_PROJECT_LESSONS.md) 中提取的 Candidate Rules 仍然要求 cross-pilot 或同等级别的新证据后才能晋升。

**Evidence before self-improvement.**

这个系统不做网站克隆。它尝试把被观测到的设计机制转化为独立原创体验；Reference evidence 仍然只是 evidence，公开访问从来不会被解释为可以复用名称、角色、叙事、视觉构图、资产、motion 或其他 source-specific expression 的许可。
