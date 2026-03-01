import React from 'react'
import { PlayCircle, ShieldCheck } from 'lucide-react'

function ActionPanel({ selectedEvent }) {
  return (
    <div className="action-wrap">
      <div className="panel-title">
        <ShieldCheck size={16} />
        <span>处置场景</span>
      </div>

      <div className="action-intro">
        <strong>当前事件类型：</strong>
        <span>{selectedEvent.title}</span>
      </div>

      <div className="action-list">
        {selectedEvent.actions.map((action) => (
          <button type="button" key={action} className="action-btn">
            <PlayCircle size={15} />
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ActionPanel
