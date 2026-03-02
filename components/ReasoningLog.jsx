import React, { useEffect, useMemo, useState } from 'react'
import { GitBranch, MessageSquareMore, Send, Target, TerminalSquare } from 'lucide-react'

function ReasoningLog({ selectedEvent, onFilterCommand }) {
  const formattedSteps = useMemo(
    () => selectedEvent.reasoningSteps.map((step, index) => `[步骤 ${index + 1}] ${step}`),
    [selectedEvent],
  )
  const fullText = useMemo(() => formattedSteps.join('\n\n'), [formattedSteps])
  const stepBoundaries = useMemo(() => {
    const list = []
    let total = 0
    formattedSteps.forEach((step, index) => {
      total += step.length
      if (index < formattedSteps.length - 1) total += 2
      list.push(total)
    })
    return list
  }, [formattedSteps])

  const traceNodes = useMemo(
    () => {
      const stepCount = selectedEvent.reasoningSteps.length
      const nodes = [{ id: 'src', label: `攻击源 ${selectedEvent.sourceIp}`, stepIndex: 0 }]

      for (let i = 0; i < stepCount; i += 1) {
        const source = selectedEvent.relatedSources[i % selectedEvent.relatedSources.length]
        nodes.push({
          id: `hop-${i + 1}`,
          label: `第${i + 1}跳 ${source?.name ?? '关联设备'}`,
          stepIndex: i,
        })
      }

      nodes.push({
        id: 'target',
        label: `攻击目标 ${selectedEvent.target}`,
        stepIndex: stepCount - 1,
      })

      return nodes.map((node, index) => {
        const y = 10 + (index * 80) / Math.max(1, nodes.length - 1)
        const x = index === 0 || index === nodes.length - 1 ? 50 : index % 2 === 0 ? 30 : 70
        return { ...node, x, y }
      })
    },
    [selectedEvent],
  )

  const stepEvidences = useMemo(
    () =>
      selectedEvent.reasoningSteps.map((step, index) => {
        const source = selectedEvent.relatedSources[index % selectedEvent.relatedSources.length]
        return {
          id: `evidence-${index + 1}`,
          title: `步骤 ${index + 1} 判定依据`,
          basis: [
            source?.status ?? '暂无设备状态',
            source?.alerts?.[0] ?? '暂无原始证据片段',
            source?.alerts?.[1] ?? '等待更多设备日志关联',
          ],
          conclusion: step,
        }
      }),
    [selectedEvent],
  )

  const [displayText, setDisplayText] = useState('')
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [evidenceModal, setEvidenceModal] = useState(null)
  const [question, setQuestion] = useState('')
  const [dialogues, setDialogues] = useState([])

  const commandOptions = [
    { cmd: '/ask', help: '追问当前告警分析' },
    { cmd: '/filter', help: '按系统/IP过滤原始告警并新开筛选页' },
  ]
  const showCommandMenu = question.trim().startsWith('/')

  const openEvidence = (node) => {
    const stepIndex = Math.max(0, node.stepIndex)
    const detail = stepEvidences[stepIndex]
    if (!detail) return

    setEvidenceModal({
      title: `${node.label} - 取证依据`,
      fields: [
        { label: '路径节点', value: node.label },
        { label: '对应步骤', value: `步骤 ${stepIndex + 1}` },
        { label: '攻击结果', value: selectedEvent.attackResult },
        { label: '当前事件', value: selectedEvent.title },
      ],
      rawText: detail.basis.join('\n'),
      conclusion: detail.conclusion,
    })
  }

  const getFollowupReply = (query) => {
    const normalized = query.toLowerCase()

    if (normalized.includes('ip') || query.includes('攻击源')) {
      return `当前核心攻击源为 ${selectedEvent.sourceIp}，建议继续在云盾平台追溯该IP近30天访问记录并核查是否攻击其他站点。`
    }
    if (query.includes('成功') || query.includes('失陷') || query.includes('攻击结果')) {
      return `本事件攻击结果判定为：${selectedEvent.attackResult}。建议结合响应码变化与主机侧日志进一步确认是否形成实际入侵。`
    }
    if (query.includes('处置') || query.includes('怎么做') || query.includes('建议')) {
      return `优先执行：${selectedEvent.actions[0]}。随后按剧本完成 ${selectedEvent.actions[1]} 与 ${selectedEvent.actions[2]}，并同步提交报告中心归档。`
    }
    return `已结合“${selectedEvent.focusType}”场景复核，该事件时间特征为“${selectedEvent.timeWindow}”。如需我继续深挖，请追问“攻击结果判定依据”或“全流量排查范围”。`
  }

  useEffect(() => {
    let index = 0
    setDisplayText('')
    setActiveStepIndex(0)
    setDialogues([
      {
        id: `bot-init-${selectedEvent.id}`,
        role: 'bot',
        text: `可针对当前告警追问：攻击结果、关联IP排查、处置优先级。`,
      },
    ])

    const timer = setInterval(() => {
      index += 1
      setDisplayText(fullText.slice(0, index))

      const currentStep = stepBoundaries.findIndex((boundary) => index <= boundary)
      setActiveStepIndex(currentStep === -1 ? stepBoundaries.length - 1 : currentStep)

      if (index >= fullText.length) {
        clearInterval(timer)
      }
    }, 18)

    return () => clearInterval(timer)
  }, [fullText, selectedEvent, stepBoundaries])

  const handleAsk = (event) => {
    event.preventDefault()
    const text = question.trim()
    if (!text) return

    if (text.startsWith('/filter')) {
      const filterText = text.replace('/filter', '').trim()
      const result = onFilterCommand?.(filterText) ?? { ok: false, message: '过滤命令未启用。' }
      setDialogues((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', text },
        { id: `b-${Date.now() + 1}`, role: result.ok ? 'bot' : 'bot-warning', text: result.message },
      ])
      setQuestion('')
      return
    }

    const askText = text.startsWith('/ask') ? text.replace('/ask', '').trim() : text
    if (!askText) {
      setDialogues((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, role: 'bot-warning', text: '请输入追问内容，例如：/ask 攻击结果判定依据是什么？' },
      ])
      return
    }

    const userMessage = { id: `u-${Date.now()}`, role: 'user', text }
    const botMessage = { id: `b-${Date.now() + 1}`, role: 'bot', text: getFollowupReply(askText) }

    setDialogues((prev) => [...prev, userMessage, botMessage])
    setQuestion('')
  }

  return (
    <div className="reasoning-wrap">
      <div className="panel-title">
        <TerminalSquare size={16} />
        <span>AI 推理实录</span>
      </div>

      <div className="reasoning-main-split">
        <div className="terminal-box">
          <pre>{displayText}</pre>
          <span className="cursor">|</span>
        </div>

        <div className="attack-trace-panel">
          <div className="trace-title">
            <GitBranch size={14} />
            <span>攻击路径取证分析</span>
          </div>

          <div className="trace-topology-board">
            <svg className="trace-line-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
              {traceNodes.slice(0, -1).map((node, index) => {
                const next = traceNodes[index + 1]
                return (
                  <line
                    key={`trace-link-${node.id}`}
                    x1={node.x}
                    y1={node.y}
                    x2={next.x}
                    y2={next.y}
                    className={`trace-link ${index <= activeStepIndex ? 'active' : ''}`}
                  />
                )
              })}
            </svg>

            {traceNodes.map((node) => (
              <div
                key={node.id}
                className={`trace-node ${node.stepIndex <= activeStepIndex ? 'active' : ''}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
              >
                <Target size={12} />
                <span className="trace-node-label">{node.label}</span>
                <div className="node-evidence-pop">
                  <button type="button" onClick={() => openEvidence(node)}>
                    取证依据
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {evidenceModal ? (
        <div className="alert-modal-mask" onClick={() => setEvidenceModal(null)}>
          <div className="alert-modal" onClick={(event) => event.stopPropagation()}>
            <div className="alert-modal-head">
              <strong>{evidenceModal.title}</strong>
              <button type="button" className="close-btn" onClick={() => setEvidenceModal(null)}>
                关闭
              </button>
            </div>

            <div className="alert-meta-grid">
              {evidenceModal.fields.map((field) => (
                <div key={field.label} className="alert-meta-item">
                  <span>{field.label}</span>
                  <strong>{field.value}</strong>
                </div>
              ))}
            </div>

            <div className="alert-raw-block">
              <div className="raw-head">取证原文</div>
              <pre>{evidenceModal.rawText}</pre>
            </div>

            <div className="alert-raw-block">
              <div className="raw-head">判定结论</div>
              <pre>{evidenceModal.conclusion}</pre>
            </div>
          </div>
        </div>
      ) : null}

      <div className="followup-panel">
        <div className="followup-title">
          <MessageSquareMore size={14} />
          <span>告警追问</span>
        </div>

        <div className="dialogue-list">
          {dialogues.map((item) => (
            <div key={item.id} className={`dialogue-item ${item.role}`}>
              {item.text}
            </div>
          ))}
        </div>

        <form className="followup-form" onSubmit={handleAsk}>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="输入 / 触发命令：/ask 或 /filter"
          />
          <button type="submit">
            <Send size={14} />
            发送
          </button>
        </form>

        {showCommandMenu ? (
          <div className="command-menu">
            {commandOptions.map((item) => (
              <button
                type="button"
                key={item.cmd}
                onClick={() => setQuestion(`${item.cmd} `)}
              >
                <strong>{item.cmd}</strong>
                <span>{item.help}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ReasoningLog
