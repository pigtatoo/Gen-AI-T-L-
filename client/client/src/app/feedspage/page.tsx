"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddFeedComponent from "../components/AddFeedComponent";

interface Feed {
  feed_id: number;
  user_id: number;
  url: string;
  name: string;
  active: boolean;
  created_at: string;
}

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/loginpage");
        return;
      }

      const response = await fetch("http://localhost:5000/api/feeds", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch feeds");
      }

      const data = await response.json();
      setFeeds(data || []);
      setError("");
    } catch (err) {
      console.error("Error fetching feeds:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load feeds"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFeed = async (feedId: number) => {
    if (!window.confirm("Are you sure you want to remove this feed?")) {
      return;
    }

    try {
      setDeleteLoading(feedId);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/loginpage");
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/feeds/${feedId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete feed");
      }

      setFeeds(feeds.filter((f) => f.feed_id !== feedId));
      setSuccessMessage("Feed removed successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setError("");
    } catch (err) {
      console.error("Error deleting feed:", err);
      setError(err instanceof Error ? err.message : "Failed to delete feed");
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📡 Manage RSS Feeds</h1>
        <p style={styles.subtitle}>
          Add your preferred RSS feeds to customize the articles used for learning and case studies
        </p>
      </div>

      {/* Navigation Link */}
      <Link href="/landingpage" style={styles.backLink}>
        ← Back to Landing Page
      </Link>

      {/* Messages */}
      {error && <div style={styles.errorMessage}>{error}</div>}
      {successMessage && (
        <div style={styles.successMessage}>{successMessage}</div>
      )}

      {/* Add Feed Component */}
      <div style={{ marginBottom: "20px" }}>
        <AddFeedComponent onFeedAdded={fetchFeeds} />
      </div>

      {/* Feeds List */}
      {isLoading ? (
        <div style={styles.loadingMessage}>Loading feeds...</div>
      ) : feeds.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No custom feeds yet. Add your first feed to get started!</p>
          <p style={styles.emptyStateNote}>
            Default feeds (Reuters, BBC, The Register) will be used if no custom feeds are added.
          </p>
        </div>
      ) : (
        <div style={styles.feedsList}>
          <h2 style={styles.feedsListTitle}>Your Feeds ({feeds.length})</h2>
          {feeds.map((feed) => (
            <div key={feed.feed_id} style={styles.feedCard}>
              <div style={styles.feedInfo}>
                <h3 style={styles.feedName}>{feed.name}</h3>
                <p style={styles.feedUrl}>{feed.url}</p>
                <p style={styles.feedDate}>
                  Added: {new Date(feed.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDeleteFeed(feed.feed_id)}
                style={{
                  ...styles.deleteButton,
                  opacity: deleteLoading === feed.feed_id ? 0.6 : 1,
                }}
                disabled={deleteLoading === feed.feed_id}
              >
                {deleteLoading === feed.feed_id ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>💡 How it works</h3>
        <ul style={styles.infoList}>
          <li>Add RSS feeds from your favorite tech news sources</li>
          <li>When the RSS sync runs, articles from your feeds will be analyzed and mapped to topics</li>
          <li>Case studies in the chat will include content from your custom feeds</li>
          <li>Remove feeds anytime - they'll be excluded from the next sync</li>
          <li>Default feeds are always available as a fallback</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  header: {
    marginBottom: "30px",
    borderBottom: "2px solid #e0e0e0",
    paddingBottom: "20px",
  } as React.CSSProperties,
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#1a1a1a",
    margin: "0 0 10px 0",
  } as React.CSSProperties,
  subtitle: {
    fontSize: "14px",
    color: "#666",
    margin: "0",
  } as React.CSSProperties,
  backLink: {
    display: "inline-block",
    marginBottom: "20px",
    color: "#0066cc",
    textDecoration: "none",
    fontSize: "14px",
    padding: "8px 12px",
    borderRadius: "4px",
    backgroundColor: "#f0f0f0",
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as React.CSSProperties,
  errorMessage: {
    backgroundColor: "#fee",
    border: "1px solid #fcc",
    color: "#c33",
    padding: "12px 16px",
    borderRadius: "4px",
    marginBottom: "15px",
    fontSize: "14px",
  } as React.CSSProperties,
  successMessage: {
    backgroundColor: "#efe",
    border: "1px solid #cfc",
    color: "#3c3",
    padding: "12px 16px",
    borderRadius: "4px",
    marginBottom: "15px",
    fontSize: "14px",
  } as React.CSSProperties,
  addButton: {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "20px",
    transition: "background-color 0.2s ease",
  } as React.CSSProperties,
  form: {
    backgroundColor: "#f9f9f9",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    padding: "20px",
    marginBottom: "20px",
  } as React.CSSProperties,
  formGroup: {
    marginBottom: "16px",
  } as React.CSSProperties,
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "6px",
    color: "#333",
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "14px",
    fontFamily: "inherit",
    boxSizing: "border-box",
  } as React.CSSProperties,
  formButtons: {
    display: "flex",
    gap: "10px",
  } as React.CSSProperties,
  submitButton: {
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    flex: "1",
    transition: "background-color 0.2s ease",
  } as React.CSSProperties,
  cancelButton: {
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "background-color 0.2s ease",
  } as React.CSSProperties,
  downloadButton: {
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    flex: "1",
    transition: "background-color 0.2s ease",
  } as React.CSSProperties,
  loadingMessage: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#666",
    fontSize: "16px",
  } as React.CSSProperties,
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    backgroundColor: "#f9f9f9",
    borderRadius: "4px",
    color: "#666",
    marginBottom: "20px",
  } as React.CSSProperties,
  emptyStateNote: {
    fontSize: "12px",
    color: "#999",
    marginTop: "10px",
  } as React.CSSProperties,
  feedsList: {
    marginBottom: "20px",
  } as React.CSSProperties,
  feedsListTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "15px",
    color: "#333",
  } as React.CSSProperties,
  feedCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "white",
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    marginBottom: "10px",
    gap: "20px",
  } as React.CSSProperties,
  feedInfo: {
    flex: "1",
    minWidth: "0",
  } as React.CSSProperties,
  feedName: {
    fontSize: "15px",
    fontWeight: "bold",
    margin: "0 0 6px 0",
    color: "#333",
  } as React.CSSProperties,
  feedUrl: {
    fontSize: "12px",
    color: "#666",
    margin: "0 0 4px 0",
    wordBreak: "break-all",
    fontFamily: "monospace",
  } as React.CSSProperties,
  feedDate: {
    fontSize: "11px",
    color: "#999",
    margin: "0",
  } as React.CSSProperties,
  deleteButton: {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    transition: "background-color 0.2s ease",
  } as React.CSSProperties,
  infoBox: {
    backgroundColor: "#f0f8ff",
    border: "1px solid #b3d9ff",
    borderRadius: "4px",
    padding: "16px",
    marginTop: "30px",
  } as React.CSSProperties,
  infoTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    marginTop: "0",
    marginBottom: "10px",
    color: "#0066cc",
  } as React.CSSProperties,
  infoList: {
    fontSize: "13px",
    color: "#333",
    margin: "0",
    paddingLeft: "20px",
    lineHeight: "1.6",
  } as React.CSSProperties,
  newsletterSection: {
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
    textAlign: "center",
  } as React.CSSProperties,
  newsletterButton: {
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "background-color 0.2s ease",
  } as React.CSSProperties,
  modalOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  } as React.CSSProperties,
  modal: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "30px",
    maxWidth: "500px",
    width: "90%",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
  } as React.CSSProperties,
  modalTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginTop: "0",
    marginBottom: "10px",
    color: "#1a1a1a",
  } as React.CSSProperties,
  modalText: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "20px",
  } as React.CSSProperties,
  modalField: {
    marginBottom: "20px",
  } as React.CSSProperties,
  modalLabel: {
    display: "block",
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#333",
  } as React.CSSProperties,
  radioGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  } as React.CSSProperties,
  radioLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    color: "#333",
    cursor: "pointer",
  } as React.CSSProperties,
  modalNote: {
    backgroundColor: "#f0f8ff",
    border: "1px solid #b3d9ff",
    borderRadius: "4px",
    padding: "10px 12px",
    marginBottom: "20px",
    fontSize: "13px",
    color: "#0066cc",
  } as React.CSSProperties,
  modalButtons: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
  } as React.CSSProperties,
};
