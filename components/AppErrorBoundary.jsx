import React, { Component } from 'react'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Unknown runtime error' }
  }

  componentDidCatch(error) {
    console.error('UI runtime error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#020617',
            color: '#e2e8f0',
            fontFamily: 'Segoe UI, sans-serif',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '760px',
              width: '100%',
              border: '1px solid #334155',
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.72)',
              padding: '16px',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: '#fb923c' }}>页面渲染失败</strong>
            <p style={{ margin: '8px 0 0' }}>
              运行时错误：{this.state.message}
            </p>
            <p style={{ margin: '8px 0 0', color: '#94a3b8' }}>
              请刷新页面；若仍异常，把这条错误信息发我，我会继续修复。
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default AppErrorBoundary
