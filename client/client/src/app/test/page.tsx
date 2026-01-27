"use client"

import React, { useState } from 'react'

export default function TestPage() {
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, content })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('saved');
        setEmail('');
        setContent('');
      } else {
        setStatus(data?.error || 'error');
      }
    } catch (err) {
      setStatus('error');
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto', padding: 16 }}>
      <h1>Send Test Email Content</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>Content</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            required
            rows={6}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <button type="submit" style={{ padding: '8px 16px' }}>Send</button>
      </form>

      {status === 'saving' && <p>Saving...</p>}
      {status === 'saved' && <p>Saved successfully.</p>}
      {status && status !== 'saving' && status !== 'saved' && <p>Error: {status}</p>}
    </div>
  )
}