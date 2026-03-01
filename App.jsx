import React, { useMemo, useState } from 'react'
import HeaderStats from './components/HeaderStats'
import EventQueue from './components/EventQueue'
import CorrelationAnalysis from './components/CorrelationAnalysis'
import ReasoningLog from './components/ReasoningLog'
import ReportCenter from './components/ReportCenter'
import ActionPanel from './components/ActionPanel'
import {
  aiNoiseEvents,
  attackClassStats,
  defaultTemplates,
  mockEvents,
  noiseReduction,
  sampleReports,
} from './data/mockData'
import './App.css'

function App() {
  const [selectedItem, setSelectedItem] = useState({ type: 'attack', id: mockEvents[0].id })
  const [templates, setTemplates] = useState(defaultTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplates[0])
  const [reports, setReports] = useState(sampleReports)

  const selectedAttackEvent = useMemo(
    () => mockEvents.find((item) => item.id === selectedItem.id) ?? mockEvents[0],
    [selectedItem],
  )

  const selectedNoiseEvent = useMemo(
    () => aiNoiseEvents.find((item) => item.id === selectedItem.id) ?? aiNoiseEvents[0],
    [selectedItem],
  )

  const selectedEvent = useMemo(() => {
    if (selectedItem.type === 'attack') return selectedAttackEvent

    const noise = selectedNoiseEvent
    const ipMatch = noise.source.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/)
    const sourceIp = ipMatch?.[0] ?? '10.0.0.1'
    const pending = noise.reviewStatus === '待复核'

    return {
      id: `${noise.id}-denoise`,
      title: `AI降噪研判：${noise.title}`,
      severity: pending ? '高危' : '高危',
      disposalStatus: pending ? '处置中' : '已处置',
      type: 'ai_denoise',
      target: '安全监测系统',
      sourceIp,
      time: noise.time,
      timeWindow: '近15分钟误报聚类分析',
      focusType: 'AI降噪研判',
      attackResult: pending ? '疑似误报（待复核）' : '无害误报',
      summary: noise.reason,
      relatedSources: [
        {
          key: 'waf',
          name: '规则命中分析',
          status: '仅命中低置信规则，缺少多设备侧证据',
          alerts: [
            `noise_tag=${noise.tag} confidence=${noise.confidence}`,
            'rule_hit=1 response_evidence=none chain_link=absent',
          ],
        },
        {
          key: 'siem',
          name: '跨设备关联结果',
          status: '未形成同源攻击链，风险评分下调',
          alerts: [
            'correlation_result=negative linked_devices<2',
            'attack_path_rebuild=failed downgrade=medium->low',
          ],
        },
        {
          key: 'intel',
          name: '威胁情报核验',
          status: '来源未命中高危IOC库',
          alerts: ['ioc_match=0 malicious_score<20', `source=${noise.source}`],
        },
      ],
      relatedServers: [
        {
          id: `${noise.id}-srv-1`,
          name: '告警聚合节点',
          owner: '安全运营平台组-值班席',
          ip: '10.30.5.19',
          port: '9000',
          zone: '安全运营区',
          risk: pending ? '中危' : '低危',
          alertCount: 3,
          links: ['waf', 'siem'],
        },
        {
          id: `${noise.id}-srv-2`,
          name: '误报特征库',
          owner: 'AI研判引擎-规则中心',
          ip: '10.30.5.27',
          port: '9200',
          zone: 'AI引擎区',
          risk: '低危',
          alertCount: 2,
          links: ['siem', 'intel'],
        },
      ],
      rawTraffic: [
        {
          serverId: `${noise.id}-srv-1`,
          time: noise.time,
          srcIp: sourceIp,
          dstIp: '10.30.5.19',
          dstPort: '9000',
          method: 'EVENT',
          path: '/alarm/ingest',
          status: '200',
          payload: `tag=${noise.tag};confidence=${noise.confidence}`,
        },
        {
          serverId: `${noise.id}-srv-1`,
          time: noise.time,
          srcIp: '10.30.5.19',
          dstIp: '10.30.5.27',
          dstPort: '9200',
          method: 'QUERY',
          path: '/feature/noise-match',
          status: '200',
          payload: 'chain_score=0.14; benign_pattern=true',
        },
      ],
      reasoningSteps: [
        `步骤1-规则初筛：识别到告警「${noise.title}」，标签为「${noise.tag}」，初始置信度 ${noise.confidence}。`,
        '步骤2-跨源关联：核验WAF/流量/主机日志，未出现连续攻击链与多跳扩散。',
        '步骤3-情报比对：源地址未命中高危IOC，历史行为与恶意画像不匹配。',
        `步骤4-业务上下文：来源为「${noise.source}」，结合报备/运维场景判定无实质危害。`,
        `步骤5-降噪结论：${pending ? '标记为待复核误报，保留观察。' : '归档为无害误报并下调告警优先级。'}`,
      ],
      actions: pending
        ? ['提交人工复核', '补充资产侧证据', '暂缓自动处置']
        : ['加入误报白名单', '同步规则优化库', '关闭重复告警推送'],
    }
  }, [selectedItem, selectedAttackEvent, selectedNoiseEvent])

  const handleGenerateReport = () => {
    const now = new Date()
    const timestamp = `${now.toLocaleDateString('zh-CN')} ${now.toLocaleTimeString('zh-CN', {
      hour12: false,
    })}`

    setReports((prev) => [
      {
        id: `report-${Date.now()}`,
        template: selectedTemplate,
        eventTitle: selectedEvent.title,
        timestamp,
        content: [
          `【模板】${selectedTemplate}`,
          `【事件】${selectedEvent.title}`,
          `【攻击源IP】${selectedEvent.sourceIp}`,
          `【攻击结果】${selectedEvent.attackResult}`,
          `【研判摘要】${selectedEvent.reasoningSteps[0]}`,
          `【建议处置】${selectedEvent.actions.join('、')}`,
        ].join('\n'),
      },
      ...prev,
    ])
  }

  const handleCreateTemplate = (templateName) => {
    const normalized = templateName.trim()
    if (!normalized) return

    setTemplates((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]))
  }

  const handleUpdateReport = (reportId, nextContent) => {
    setReports((prev) =>
      prev.map((item) => (item.id === reportId ? { ...item, content: nextContent } : item)),
    )
  }

  return (
    <div className="app-shell">
      <header className="panel header-panel">
        <HeaderStats noiseReduction={noiseReduction} attackClassStats={attackClassStats} />
      </header>

      <main className="body-grid">
        <aside className="panel left-panel">
          <EventQueue
            events={mockEvents}
            noiseEvents={aiNoiseEvents}
            selectedItem={selectedItem}
            onSelectAttack={(id) => setSelectedItem({ type: 'attack', id })}
            onSelectNoise={(id) => setSelectedItem({ type: 'noise', id })}
          />
        </aside>

        <section className="center-panel">
          <div className="panel center-top">
            <CorrelationAnalysis selectedEvent={selectedEvent} />
          </div>
          <div className="panel center-bottom">
            <ReasoningLog selectedEvent={selectedEvent} />
          </div>
        </section>

        <aside className="right-panel">
          <div className="panel right-top">
            <ReportCenter
              templates={templates}
              selectedTemplate={selectedTemplate}
              onTemplateChange={setSelectedTemplate}
              onCreateTemplate={handleCreateTemplate}
              onGenerate={handleGenerateReport}
              reports={reports}
              onUpdateReport={handleUpdateReport}
            />
          </div>
          <div className="panel right-bottom">
            <ActionPanel selectedEvent={selectedEvent} />
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
