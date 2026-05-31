import { FileText, Info } from 'lucide-react';
import { PageHeader } from '../components/UI';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="보고서 생성"
        subtitle="업무 데이터를 기반으로 보고서를 생성합니다"
      />
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-200">보고서 기능 준비 중</h2>
        <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 max-w-md text-left">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300">
            보고서 생성 기능은 현재 클라우드 버전에서 지원되지 않습니다.
            샘플 관리 및 업무 통계 페이지에서 데이터를 직접 확인하거나,
            브라우저의 인쇄 기능(Ctrl+P)을 활용해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
