'use client';

import React, { useEffect, useState } from 'react';

export default function ServerMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    fetch(`${apiBase}/api/hello`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMessage((data && (data.message as string)) || JSON.stringify(data));
      })
      .catch((err) => {
        setError(err?.message || String(err));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-zinc-500">Connecting to server…</div>;
  if (error) return <div className="text-sm text-red-600">Server error: {error}</div>;
  return (
    <div className="text-sm text-zinc-700">
      Server says: <strong>{message}</strong>
    </div>
  );
}
