import { supabase } from './lib/supabase';
import FreePractice from './pages/FreePractice';
import Home from './pages/Home';
import Student from './pages/Student';
import TeacherApp from './pages/teacher/TeacherApp';
import { useRoute } from './router';

export default function App() {
  const route = useRoute();

  if (route === '/tu-do') return <FreePractice />;
  if (supabase && route === '/co') return <TeacherApp />;
  const lop = /^\/lop\/([A-Za-z0-9]+)$/.exec(route);
  if (supabase && lop) return <Student code={lop[1].toUpperCase()} />;
  return <Home />;
}
