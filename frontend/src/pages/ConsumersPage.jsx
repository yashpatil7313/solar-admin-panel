import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  UserPlus,
  Phone,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Workflow,
  Globe2,
  Clock,
  Search,
  FileUp,
  Sparkles,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function ConsumersPage({ onUploadDocs, setActiveTab }) {
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [consumersList, setConsumersList] = useState([]);
  const [fetchingList, setFetchingList] = useState(false);
  const [dirSearch, setDirSearch] = useState('');

  const fetchConsumers = async () => {
    try {
      setFetchingList(true);
      const res = await axios.get(`${API_BASE_URL}/consumers`);
      setConsumersList(res.data.consumers || []);
    } catch (err) {
      console.error('Failed to fetch consumers list:', err);
    } finally {
      setFetchingList(false);
    }
  };

  useEffect(() => {
    fetchConsumers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name.trim() || !formData.phone_number.trim() || !formData.address.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/consumers`, {
        name: formData.name.trim(),
        phone_number: formData.phone_number.trim(),
        address: formData.address.trim(),
      });

      setSuccess(
        `Consumer "${response.data.consumer.name}" registered with ID #${response.data.consumer.id}!`
      );
      setFormData({ name: '', phone_number: '', address: '' });
      fetchConsumers();
    } catch (err) {
      console.error('Consumer registration error:', err);
      setError(
        err.response?.data?.error || 'Failed to register consumer. Please verify backend connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConsumer = async (consumerId, consumerName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete consumer "${consumerName}" (ID #${consumerId}) and all of their uploaded documents/photos?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(consumerId);
      setError(null);
      await axios.delete(`${API_BASE_URL}/consumers/${consumerId}`);
      setConsumersList((prev) => prev.filter((c) => c.id !== consumerId));
      setSuccess(`Deleted consumer "${consumerName}" (ID #${consumerId}) and all linked files.`);
    } catch (err) {
      console.error('Delete consumer error:', err);
      setError(err.response?.data?.error || 'Failed to delete consumer.');
    } finally {
      setDeletingId(null);
    }
  };

  // KPI calculations
  const totalConsumers = consumersList.length;
  const rtsDoneCount = consumersList.filter((c) => c.rts_status === 'Done').length;
  const npDoneCount = consumersList.filter((c) => c.national_portal_status === 'Done').length;
  const pendingCount = consumersList.filter(
    (c) => c.rts_status !== 'Done' || c.national_portal_status !== 'Done'
  ).length;

  // Filtered directory list
  const filteredConsumers = consumersList.filter((c) => {
    if (!dirSearch.trim()) return true;
    const q = dirSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone_number?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  });

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Consumers
            </p>
            <p className="text-3xl font-extrabold text-slate-900 mt-1 font-display">
              {totalConsumers}
            </p>
            <p className="text-xs text-slate-500 mt-1">Registered solar applicants</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab && setActiveTab('rts')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition cursor-pointer flex items-center justify-between group"
        >
          <div>
            <div className="flex items-center space-x-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                RTS Completed
              </p>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition" />
            </div>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1 font-display">
              {rtsDoneCount}
              <span className="text-sm font-medium text-slate-400 ml-1">/ {totalConsumers}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Rooftop surveys verified</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Workflow className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab && setActiveTab('national-portal')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer flex items-center justify-between group"
        >
          <div>
            <div className="flex items-center space-x-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                National Portal
              </p>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition" />
            </div>
            <p className="text-3xl font-extrabold text-blue-600 mt-1 font-display">
              {npDoneCount}
              <span className="text-sm font-medium text-slate-400 ml-1">/ {totalConsumers}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Subsidy filings completed</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Globe2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Workflows
            </p>
            <p className="text-3xl font-extrabold text-amber-600 mt-1 font-display">
              {pendingCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">Awaiting RTS or Portal action</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Add New Consumer Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Decorative Gradient Header */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 px-6 py-6 text-white relative overflow-hidden">
            <div className="relative z-10 flex items-center space-x-3.5">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm text-white shadow-inner">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider bg-black/15 px-2.5 py-0.5 rounded-full mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Step 1 &bull; Onboarding</span>
                </div>
                <h1 className="text-xl font-bold font-display">Register New Consumer</h1>
              </div>
            </div>
          </div>

          <div className="p-6">
            {success && (
              <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 flex-shrink-0" />
                <div className="text-sm font-medium">{success}</div>
              </div>
            )}

            {error && (
              <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800">
                <AlertCircle className="w-5 h-5 mt-0.5 text-rose-600 flex-shrink-0" />
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Consumer Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Ramesh Kumar Sharma"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-medium transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-medium transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Site / Installation Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute top-3.5 left-3.5 pointer-events-none text-slate-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <textarea
                    name="address"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="House No., Society, Landmark, City, State - Pincode"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm font-medium transition"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering Consumer...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Consumer to Database
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Registered Consumers Directory (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Consumer Directory
              </h2>
              <p className="text-xs text-slate-500">
                Overview of all registered consumers and their workflow stages
              </p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={dirSearch}
                onChange={(e) => setDirSearch(e.target.value)}
                placeholder="Filter directory..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>
          </div>

          {fetchingList ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs font-medium">Loading consumer records...</span>
            </div>
          ) : filteredConsumers.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Consumers Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {dirSearch
                  ? 'No consumer matches your search filter.'
                  : 'Use the registration form on the left to add your first solar consumer.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Consumer</th>
                    <th className="px-4 py-3.5">Contact &amp; Site</th>
                    <th className="px-4 py-3.5">Workflow Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredConsumers.map((c) => (
                    <tr key={c.id} className="hover:bg-amber-50/30 transition group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-200/60 flex-shrink-0">
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{c.name}</div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              ID #{c.id} &bull; {new Date(c.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs font-semibold text-slate-700">{c.phone_number}</div>
                        <div
                          className="text-xs text-slate-400 max-w-[200px] truncate mt-0.5"
                          title={c.address}
                        >
                          {c.address}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col space-y-1.5">
                          <span
                            className={`inline-flex items-center w-fit px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              c.rts_status === 'Done'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            RTS: {c.rts_status}
                          </span>
                          <span
                            className={`inline-flex items-center w-fit px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              c.national_portal_status === 'Done'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Portal: {c.national_portal_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end space-x-2">
                          {onUploadDocs && (
                            <button
                              type="button"
                              onClick={() => onUploadDocs(c.id)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white border border-purple-200/80 transition shadow-sm"
                            >
                              <FileUp className="w-3.5 h-3.5" />
                              <span>Upload Docs</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={deletingId === c.id}
                            onClick={() => handleDeleteConsumer(c.id, c.name)}
                            title="Delete Consumer"
                            className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200/80 transition shadow-sm disabled:opacity-50"
                          >
                            {deletingId === c.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
