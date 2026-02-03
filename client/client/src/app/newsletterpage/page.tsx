"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Module {
  module_id: number;
  title: string;
  description: string;
}

interface Topic {
  topic_id: number;
  module_id: number;
  title: string;
}

interface Subscription {
  id: number;
  module_id: number;
  topic_ids: number[];
  email: string;
  is_active: boolean;
  Module: Module;
}

export default function NewsletterPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [topics, setTopics] = useState<{ [key: number]: Topic[] }>({});
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [sendingSubscriptionId, setSendingSubscriptionId] = useState<number | null>(null);
  const [sentSubscriptionIds, setSentSubscriptionIds] = useState<Set<number>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchModulesAndSubscriptions();
  }, []);

  const fetchModulesAndSubscriptions = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/loginpage");
        return;
      }

      // Get user info to prefill email
      const userEmail = localStorage.getItem("userEmail") || "";
      setEmail(userEmail);

      // Fetch modules
      const modulesRes = await fetch(`${API_URL}/api/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!modulesRes.ok) throw new Error("Failed to fetch modules");
      const modulesData = await modulesRes.json();
      setModules(modulesData);

      // Fetch topics for each module
      const topicsMap: { [key: number]: Topic[] } = {};
      for (const module of modulesData) {
        const topicsRes = await fetch(
          `${API_URL}/api/modules/${module.module_id}/topics`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (topicsRes.ok) {
          const topicsData = await topicsRes.json();
          topicsMap[module.module_id] = topicsData;
        }
      }
      setTopics(topicsMap);

      // Fetch existing subscriptions
      const subsRes = await fetch(
        `${API_URL}/api/user/newsletter-subscriptions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubscriptions(subsData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setErrorMessage("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleSelect = (moduleId: number) => {
    setSelectedModule(moduleId);
    // Load existing subscription for this module if any
    const existingSub = subscriptions.find((s) => s.module_id === moduleId);
    if (existingSub) {
      setSelectedTopics(existingSub.topic_ids);
      setEmail(existingSub.email);
    } else {
      setSelectedTopics([]);
      setEmail(localStorage.getItem("userEmail") || "");
    }
  };

  const handleTopicToggle = (topicId: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((t) => t !== topicId) : [...prev, topicId]
    );
  };

  const handleSubscribe = async () => {
    if (!selectedModule || selectedTopics.length === 0) {
      setErrorMessage("Please select a module and at least one topic");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/api/user/newsletter-subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          module_id: selectedModule,
          topic_ids: selectedTopics,
          email: email || undefined,
          is_active: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save subscription");
      }

      setSuccessMessage("✓ Newsletter subscription saved successfully!");
      // Refresh subscriptions
      await fetchModulesAndSubscriptions();
      setSelectedModule(null);
      setSelectedTopics([]);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving subscription");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubscription = async (subscriptionId: number) => {
    if (!window.confirm("Are you sure you want to delete this subscription?")) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/api/user/newsletter-subscriptions/${subscriptionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to delete subscription");

      setSuccessMessage("✓ Subscription deleted successfully!");
      await fetchModulesAndSubscriptions();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error deleting subscription");
    }
  };

  const handleSendSubscription = async (subscriptionId: number) => {
    try {
      setErrorMessage('');
      setSuccessMessage('');
      setSendingSubscriptionId(subscriptionId);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/user/newsletter-subscriptions/send/${subscriptionId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to send newsletter');
      setSuccessMessage('✓ Newsletter sent successfully');
      setSentSubscriptionIds(prev => new Set(prev).add(subscriptionId));
      setTimeout(() => {
        setSuccessMessage('');
        setSentSubscriptionIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(subscriptionId);
          return newSet;
        });
      }, 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error sending newsletter');
    } finally {
      setSendingSubscriptionId(null);
    }
  };

  const handleToggleActive = async (subscription: Subscription) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_URL}/api/user/newsletter-subscriptions/${subscription.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            is_active: !subscription.is_active,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update subscription");

      setSuccessMessage(
        `✓ Subscription ${!subscription.is_active ? "activated" : "paused"}!`
      );
      await fetchModulesAndSubscriptions();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error updating subscription");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/landingpage")}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Back to modules"
            >
              ←
            </button>
            <h1 className="text-3xl font-bold text-black">📰 Newsletter Subscriptions</h1>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Subscription Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
              <h2 className="text-xl font-semibold text-black mb-6">Add/Update Subscription</h2>

              {/* Module Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-black mb-3">
                  Select Module
                </label>
                <div className="space-y-2">
                  {modules.map((module) => (
                    <button
                      key={module.module_id}
                      onClick={() => handleModuleSelect(module.module_id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedModule === module.module_id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <h3 className="font-semibold text-black">{module.title}</h3>
                      <p className="text-sm text-gray-600">{module.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Selection */}
              {selectedModule && topics[selectedModule] && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-black mb-3">
                    Select Topics
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {topics[selectedModule].map((topic) => (
                      <label
                        key={topic.topic_id}
                        className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTopics.includes(topic.topic_id)}
                          onChange={() => handleTopicToggle(topic.topic_id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-3 text-gray-800">{topic.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-black mb-2">
                  Receive Newsletters At
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-black placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Info Box */}
              {selectedModule && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>📅 Schedule:</strong> Newsletters will be sent every Monday at 7:00 AM
                    (Singapore Time)
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>📊 Frequency:</strong> Weekly newsletters for selected topics will be
                    delivered after new articles are loaded
                  </p>
                </div>
              )}

              {/* Subscribe Button */}
              <button
                onClick={handleSubscribe}
                disabled={isSaving || !selectedModule || selectedTopics.length === 0}
                className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? "Saving..." : subscriptions.find(s => s.module_id === selectedModule) ? "Update Subscription" : "Subscribe to Newsletter"}
              </button>

              {/* Info: Already subscribed */}
              {selectedModule && subscriptions.find(s => s.module_id === selectedModule) && (
                <p className="mt-3 text-sm text-blue-600">
                  ✓ You are already subscribed to this module. Click the button above to update your subscription.
                </p>
              )}
            </div>
          </div>

          {/* Right: Current Subscriptions */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
              <h2 className="text-xl font-semibold text-black mb-6">Your Subscriptions</h2>

              {subscriptions.length === 0 ? (
                <p className="text-gray-500 text-sm">No active subscriptions yet</p>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className={`p-4 rounded-lg border ${
                        sub.is_active
                          ? "border-green-200 bg-green-50"
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-black text-sm">
                          {modules.find(m => m.module_id === sub.module_id)?.title || 'Unknown Module'}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded font-semibold ${
                            sub.is_active
                              ? "bg-green-200 text-green-800"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {sub.is_active ? "Active" : "Paused"}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 mb-2">
                        📧 {sub.email}
                      </p>

                      <p className="text-xs text-gray-700 mb-3">
                        <strong>Topics:</strong>
                        <br />
                        {topics[sub.module_id]
                          ?.filter((t) => sub.topic_ids.includes(t.topic_id))
                          .map((t) => t.title)
                          .join(", ")}
                      </p>

                      <button
                        onClick={() => handleToggleActive(sub)}
                        className={`w-full mb-2 px-2 py-1 text-xs font-semibold rounded transition-colors ${
                          sub.is_active
                            ? "bg-yellow-600 text-white hover:bg-yellow-700"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {sub.is_active ? "⏸ Pause Newsletter" : "▶ Resume Newsletter"}
                      </button>

                      <button
                        onClick={() => handleDeleteSubscription(sub.id)}
                        className="w-full px-2 py-1 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="mt-6 bg-blue-50 rounded-2xl border border-blue-200 p-6">
              <h3 className="font-semibold text-blue-900 mb-3">ℹ️ How It Works</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>✓ Subscribe to modules and topics</li>
                <li>✓ Receive PDF newsletters weekly</li>
                <li>✓ Contains articles, case studies & Q&A</li>
                <li>✓ Sent every Monday at 7 AM</li>
                <li>✓ Pause/resume anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
