import { HashRouter } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { CarouselProvider } from './contexts/CarouselContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CarouselProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </CarouselProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
