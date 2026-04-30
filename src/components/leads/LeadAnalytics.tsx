'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  XAxis, 
  YAxis, 
  Bar, 
  Tooltip as RechartsTooltip 
} from 'recharts';

interface LeadAnalyticsProps {
  analyticsData: {
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    sourceEfficiencyData: any[];
    lawyerDistributionData: any[];
    interviewerPerformanceData: any[];
  } | null;
}

const COLORS = ['#D4AF37', '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function LeadAnalytics({ analyticsData }: LeadAnalyticsProps) {
  if (!analyticsData) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
      <Card className="bg-[#0f172a] border-white/5 p-6 rounded-3xl lg:col-span-1 flex flex-col justify-center items-center text-center shadow-2xl">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Taxa de Conversão Global</p>
        <div className="relative h-32 w-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: 'Convertidos', value: analyticsData.convertedLeads },
                  { name: 'Restante', value: analyticsData.totalLeads - analyticsData.convertedLeads }
                ]}
                innerRadius={45}
                outerRadius={60}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill="#D4AF37" />
                <Cell fill="rgba(255,255,255,0.05)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white">{analyticsData.conversionRate.toFixed(1)}%</span>
          </div>
        </div>
        <p className="mt-4 text-[10px] font-bold text-slate-400">{analyticsData.convertedLeads} de {analyticsData.totalLeads} leads convertidos</p>
      </Card>

      <Card className="bg-[#0f172a] border-white/5 p-6 rounded-3xl lg:col-span-1 shadow-2xl">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Eficiência por Fonte</p>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analyticsData.sourceEfficiencyData.slice(0, 5)} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={80} axisLine={false} tickLine={false} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="efficiency" fill="#D4AF37" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="bg-[#0f172a] border-white/5 p-6 rounded-3xl lg:col-span-1 shadow-2xl">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Interrevistador (Conversão)</p>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analyticsData.interviewerPerformanceData.slice(0, 5)}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis hide />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="rate" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="bg-[#0f172a] border-white/5 p-6 rounded-3xl lg:col-span-1 shadow-2xl">
        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4">Distribuição por Advogado</p>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={analyticsData.lawyerDistributionData.slice(0, 5)}
                innerRadius={0}
                outerRadius={60}
                paddingAngle={0}
                dataKey="count"
              >
                {analyticsData.lawyerDistributionData.slice(0, 5).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
