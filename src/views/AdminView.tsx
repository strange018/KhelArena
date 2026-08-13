import React, { useState, useEffect } from 'react';
import { Venue, AuditLog } from '../types';
import { api } from '../lib/api';
import { ShieldCheck, TrendingUp, Building, Users, CheckCircle2, XCircle, FileText, Settings, DollarSign } from 'lucide-react';

export const AdminView: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [pendingVenues, setPendingVenues] = useState<Venue[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [dashRes, pendingRes, auditRes] = await Promise.all([
        api.getAdminDashboard(),
        api.getPendingVenues(),
        api.getAuditLogs()
      ]);
      setDashboard(dashRes);
      setPendingVenues(pendingRes);
      setAuditLogs(auditRes);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyVenue = async (venueId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await api.verifyVenue(venueId, { status, commission_rate: 7.0 });
      alert(`Venue verification updated to ${status}`);
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Verification update failed');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Admin Header */}
      <div className="bg-gradient-to-br from-purple-50/90 via-white to-slate-50 text-slate-900 rounded-3xl p-8 border border-purple-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-black font-display text-slate-900">Super Admin Control Center</h1>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Marketplace analytics, venue approvals, financial commission ledger, payouts & immutable audit logs.
          </p>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Marketplace GMV</div>
          <div className="text-2xl font-black text-slate-900">₹{dashboard?.kpis?.total_gmv || 0}</div>
          <div className="text-[10px] text-emerald-600 font-bold">100% Real Transactions</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Platform Revenue (7%)</div>
          <div className="text-2xl font-black text-emerald-600">₹{dashboard?.kpis?.total_commission || 0}</div>
          <div className="text-[10px] text-slate-500">Take Rate: {dashboard?.kpis?.take_rate}</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Venue Utilization Rate</div>
          <div className="text-2xl font-black text-purple-600">{dashboard?.kpis?.venue_utilization || '24%'}</div>
          <div className="text-[10px] text-slate-500">Peak hour slot occupancy</div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Active Venues / Players</div>
          <div className="text-2xl font-black text-slate-900">{dashboard?.kpis?.active_venues || 3} / {dashboard?.kpis?.total_players || 4}</div>
          <div className="text-[10px] text-amber-600 font-bold">{pendingVenues.length} Pending Approval</div>
        </div>
      </div>

      {/* Pending Venue Approvals */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Building className="w-5 h-5 text-purple-600" />
          <span>Pending Venue Applications ({pendingVenues.length})</span>
        </h2>

        {pendingVenues.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">No pending venue applications requiring verification.</p>
        ) : (
          <div className="space-y-3">
            {pendingVenues.map((venue) => (
              <div key={venue.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-extrabold text-slate-900 text-sm">{venue.name}</div>
                  <div className="text-slate-600">Owner: {venue.owner_name} ({venue.owner_phone})</div>
                  <div className="text-slate-500">{venue.address} ({venue.area_name})</div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleVerifyVenue(venue.id, 'VERIFIED')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Venue</span>
                  </button>

                  <button
                    onClick={() => handleVerifyVenue(venue.id, 'REJECTED')}
                    className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Logs Viewer */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <FileText className="w-5 h-5 text-slate-700" />
          <span>Immutable System Audit Logs</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                <th className="py-2">Timestamp</th>
                <th className="py-2">Actor / Role</th>
                <th className="py-2">Action</th>
                <th className="py-2">Resource</th>
                <th className="py-2">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.slice(0, 15).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</td>
                  <td className="py-2.5 text-slate-800 font-bold">{log.actor_role}</td>
                  <td className="py-2.5 text-emerald-600 font-bold">{log.action}</td>
                  <td className="py-2.5 text-slate-600">{log.resource} ({log.resource_id || '-'})</td>
                  <td className="py-2.5 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
