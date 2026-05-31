import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/Upload';
import WorkLogs from './pages/WorkLogs';
import Samples from './pages/Samples';
import EquipmentPage from './pages/Equipment';
import ReagentsPage from './pages/Reagents';
import TodosPage from './pages/Todos';
import StatisticsPage from './pages/Statistics';
import ReportsPage from './pages/Reports';
import CalculatorPage from './pages/Calculator';
import SettingsPage from './pages/Settings';
import MethodsPage from './pages/Methods';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/worklogs" element={<WorkLogs />} />
          <Route path="/samples" element={<Samples />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/reagents" element={<ReagentsPage />} />
          <Route path="/todos" element={<TodosPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/methods" element={<MethodsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
