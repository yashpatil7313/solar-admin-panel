import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Search,
  Globe2,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  X,
  Phone,
  MapPin,
  Filter,
  Trash2,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function NationalPortalPage() {
  const [consumers, setConsumers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Done' | 'not Done'
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchNationalPortalConsumers = useCallback(async (query = '') => {
    try {
      setLoading(true);
      const url = query.trim()
        ? `${API_BASE_URL}/consumers/national-portal?search=${encodeURIComponent(query.trim())}`
        : `${API_BASE_URL}/consumers/national-portal`;
      const res = await axios.get(url);
      setConsumers(res.data.consumers || []);
    } catch (err) {
      console.error('Error fetching National Portal consumers:', err);
      setFeedback({ type: 'error', message: 'Failed to load National Portal consumers.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchNationalPortalConsumers(searchTerm);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, fetchNationalPortalConsumers]);

  const handleStatusUpdate = async (consumerId, newStatus) => {
    const currentConsumer = consumers.find((c) => c.id === consumerId);
    if (currentConsumer?.national_portal_status === newStatus) return;

    const previousConsumers = [...consumers];
    setConsumers((prev) =>
      prev.map((c) => (c.id === consumerId ? { ...c, national_portal_status: newStatus } : c))
    );
    setUpdatingId(consumerId);
    setFeedback(null);

    try {
      await axios.patch(`${API_BASE_URL}/consumers/${consumerId}/national-portal`, {
        national_portal_status: newStatus,
      });
      setFeedback({
        type: 'success',
        message: `Updated Consumer #${consumerId} (${currentConsumer?.name}) National Portal status to "${newStatus}"`,
      });
    } catch (err) {
      console.error('Error updating National Portal status:', err);
      setConsumers(previousConsumers);
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.error ||
          `Failed to update National Portal status for #${consumerId}`,
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteConsumer = async (consumerId, consumerName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete consumer "${consumerName}" (ID #${consumerId}) and all linked documents?`
      )
    )
      return;

    try {
      setUpdatingId(consumerId);
      await axios.delete(`${API_BASE_URL}/consumers/${consumerId}`);
      setConsumers((prev) => prev.filter((c) => c.id !== consumerId));
      setFeedback({
        type: 'success',
        message: `Deleted Consumer #${consumerId} (${consumerName}) successfully.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to delete consumer.',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics
  const totalCount = consumers.length;
  const doneCount = consumers.filter((c) => c.national_portal_status === 'Done').length;
  const pendingCount = totalCount - doneCount;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Filtered rows by status tab
  const displayedConsumers = consumers.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.national_portal_status === statusFilter;
  });

  const getInitials = (name = '') =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Hero Banner + Progress Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20">
                <Globe2 className="w-7 h-7 text-blue-200" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Stage 3 &bull; PM Surya Ghar / National Portal
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 font-display">
                  National Portal Workflow
                </h1>
                <p className="text-sm text-blue-100/90 mt-1 max-w-xl">
                  Track central government subsidy registrations, feasibility approvals, and commissioning status on the National Portal.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Progress Card */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Portal Completion Rate
            </span>
            <span className="text-2xl font-extrabold text-blue-600 font-display">
              {completionPct}%
            </span>
          </div>

          <div className="my-4">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl px-3.5 py-2">
              <div className="text-[11px] font-semibold text-blue-700">Completed (Done)</div>
              <div className="text-lg font-extrabold text-blue-900">{doneCount}</div>
            </div>
            <div className="bg-amber-50/70 border border-amber-100 rounded-xl px-3.5 py-2">
              <div className="text-[11px] font-semibold text-amber-700">Pending (not Done)</div>
              <div className="text-lg font-extrabold text-amber-900">{pendingCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-xl w-fit">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
            {[
              { id: 'all', label: `All (${totalCount})` },
              { id: 'Done', label: `Done (${doneCount})` },
              { id: 'not Done', label: `not Done (${pendingCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full md:w-96 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search consumer by name, phone, or address..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl flex items-center justify-between text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2 font-medium">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* National Portal Consumers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            National Portal Consumer Records ({displayedConsumers.length})
          </h2>
          {loading && (
            <div className="flex items-center space-x-1.5 text-xs text-blue-600 font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing...</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/70">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Consumer Details</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Site Address</th>
                <th className="px-6 py-4">Portal Status</th>
                <th className="px-6 py-4 text-center">Portal Toggle Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedConsumers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                    {loading
                      ? 'Searching consumers...'
                      : 'No consumers found matching your search or filter.'}
                  </td>
                </tr>
              ) : (
                displayedConsumers.map((consumer) => {
                  const isDone = consumer.national_portal_status === 'Done';
                  const isRowUpdating = updatingId === consumer.id;

                  return (
                    <tr key={consumer.id} className="hover:bg-blue-50/25 transition">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500">
                        #{consumer.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                              isDone
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {getInitials(consumer.name)}
                          </div>
                          <span className="font-bold text-slate-900">{consumer.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center space-x-1.5 text-slate-700 font-medium">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{consumer.phone_number}</span>
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 max-w-xs truncate text-slate-600"
                        title={consumer.address}
                      >
                        <span className="inline-flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{consumer.address}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isDone ? (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Done</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200/60">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>not Done</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center space-x-2">
                          {/* Segmented Radio / Toggle Button Group for 'Done' and 'not Done' */}
                          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-inner">
                            <button
                              type="button"
                              disabled={isRowUpdating}
                              onClick={() => handleStatusUpdate(consumer.id, 'Done')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                                isDone
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`np-status-${consumer.id}`}
                                checked={isDone}
                                onChange={() => {}}
                                className="accent-emerald-600 pointer-events-none w-3 h-3"
                              />
                              <span>Done</span>
                            </button>

                            <button
                              type="button"
                              disabled={isRowUpdating}
                              onClick={() => handleStatusUpdate(consumer.id, 'not Done')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                                !isDone
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`np-status-${consumer.id}`}
                                checked={!isDone}
                                onChange={() => {}}
                                className="accent-rose-600 pointer-events-none w-3 h-3"
                              />
                              <span>not Done</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={isRowUpdating}
                            onClick={() => handleDeleteConsumer(consumer.id, consumer.name)}
                            title="Delete Consumer"
                            className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200/80 transition shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
