<p align="right">
  <a href="./POLICIES.md">English</a> · <strong>简体中文</strong>
</p>

# 研究、Rights 与原创性策略

## 公开 Evidence 边界

Reference mode 只接受明确提供、且不包含凭据的 HTTP(S) URL，并拒绝明显的 loopback、private、reserved 与 link-local 目标。DNS 结果以及每一次浏览器 request 都会经过检查，因此 redirect、popup 和 subresource 也继续受同一策略约束。Fixture override 只允许被明确请求的 loopback origin。应用层 DNS 检查可以降低风险，但不能彻底消除 DNS rebinding 的竞态问题。

Capture 使用全新的、非持久化浏览器 context。Service Worker、WebSocket 与通过 `window.open` 创建 popup 的行为会被阻断，并设置防御性 popup cap，在异常情况下 fail closed。检查保持被动：不会任意 click、typing、submit，不进行 account action，不主动获取 source map，不对 bundle 进行 de-minification，也不镜像网站资产。允许有边界的 scroll sweep。

系统不会主动保存：

- request / response body；
- cookie；
- Authorization header；
- browser storage；
- profile；
- 完整 HTML；
- 完整 stylesheet；
- JavaScript source；
- site mirror。

URL 会去掉 credential、query string 与 fragment。Console 正文会被替换为有界 SHA-256 metadata。Heading 与 affordance label 只保留短文本并设置长度上限；下游 artifact 描述的是内容角色，而不是复制源站 prose。

## Rights 与 anti-copy 模型

**可访问不等于获得许可。**

`inspect_only`、`unknown`、`permission_required` 与 `blocked` 都是保守状态；更强的 rights 状态需要独立、明确的 provenance。自动 metadata 只用于风险管理，从不构成法律意见，也不是 fair-use certification。

Screenshot 和观测到的第三方内容都属于研究证据，不是可复用资产。Inference 与 abstraction 不能自动提升 rights。每个 Design Principle 都要求：

- 只进行 abstraction-level 使用；
- 创建独立设计的视觉表达；
- 禁止复用 source asset / prose；
- 禁止精确复制 layout 或 motion；
- 禁止重建 source code。

Source-specific element 始终保持 reference-only。这些规则是工程 guardrail，不代表“只要不完全一样就一定法律安全”。

## Evidence Firewall

抽象阶段的 Agent 接收 Analysis Packet、经过批准的 screenshot evidence、schema 和 [Reference Intelligence protocol](REFERENCE_INTELLIGENCE_PROTOCOL.md)。它不应：

- 重新浏览原始 URL；
- 搜索已有 clone implementation；
- 检查未包含在 packet 中的 source；
- 把 source pixel / text / asset 直接转换成实现指令。

当前 enforcement 依赖 protocol 和 contract，而不是声称已经实现网络级或密码学级隔离。

## M3 Firewalls 与 Creative Rights

Reference Evidence Firewall 只把已经验证的 M2 abstraction 和 opaque reference identity 交给 synthesis。为了确定性 provenance 验证，source metadata 可以保留在内部 section，但不会进入 agent-facing projection。

Synthesis protocol 禁止简单进行 feature 拼接，要求使用：

```text
problem
→ experience
→ mechanism
→ tradeoff
→ original expression
```

Originality Firewall 则只把 Project Brief 与 source-neutral Synthesis Unit 提供给创意阶段，并排除：

- URL；
- source name；
- screenshot；
- raw evidence；
- M2 claim / principle ID；
- source prose / asset / code；
- layout measurement；
- exact motion sequence。

Influence 用可审计 ledger 记录，而不是虚构“原创度百分比”。

`original`、`permissioned_or_licensed` 与 `third_party_adaptation_requires_human_review` 是 workflow mode，不是法律结论。在 `original` 模式下，可识别的受保护表达被明确禁止。任何阶段都不会自动提升 reference rights、宣告 fair use 或提供法律 clearance。

自动化的 M3 输出不能批准 Concept。只有后续明确的人类 provenance 才能把 `pending_human_selection` Gate 变成 approval、revision request 或 rejection。

## Artifact 生命周期

Run 保存在 Git 忽略的仓库本地 `runs/`；测试 artifact 与进程控制的临时文件位于忽略的 `.tmp/`。Manifest 与 packet 使用可移植的 repository-relative path 和 SHA-256 hash。

以下内容不进入 Git：

- third-party run；
- screenshot；
- browser binary；
- cache；
- report。

只有项目自有 fixture 可以进入 source control。本仓库没有 GitHub Actions；`npm run check` 是 canonical local gate。

## M4.2 实现与 Human Playtest 边界

经过批准的 source-neutral Implementation Contract 可以在隔离的 Pilot 目录内生成独立创作的 code、prose、CSS 与 inline vector form。

Creative asset 与 build/test dependency 必须分开分类，并通过 Source Manifest 做 hash 绑定。除非存在明确 license record，创意资产必须保持 project-native。

运行时内容不得访问：

- reference website；
- CDN；
- analytics；
- external font；
- external media；
- external API。

Automated QA 可以证明确定性和浏览器可观测属性，但不能宣称：

- 审美已经成功；
- pacing 有意义；
- 人类一定能感知分支差异；
- 完整 WCAG conformance；
- physical-device behavior 已验证；
- 人类已经批准。

M4.2 Gate 的自动状态固定为 `pending_human_playtest`。只有后续明确的人类动作可以批准扩展、请求 revision 或拒绝方向。

Human feedback 不会重写历史 Gate 或 manifest。Revision 必须创建新的 feedback artifact，精确保留已经评价与 `not_evaluated` 的维度，区分 human observation 与 derived design inference，并绑定失败实现。只有在明确绑定 `request_revision` 的情况下，revision contract 才能修改 interaction。

M4.2R 自动化最多只能输出 `pending_human_replaytest`。即使结构性前提——observation、deliberation、explicit commitment、continuous-scene identity、immediate world response、reflection 前 continuation——全部通过，也不能自动宣称此前的人类失败已经解决。这个判断仍然必须由第二次 Human Evaluation 完成。
