import { useEffect, useState } from 'react';
import { type FrontendMeasurements } from '../../shared-types';

function App() {
  const [m, sm] = useState<FrontendMeasurements | null>(null);
  useEffect(() => {
    const id = setInterval(async () => {
      // Because we injected a <base> tag in development, relative fetches would hit 3011.
      // So we explicitly construct the absolute URL to ensure we hit the 3010 backend securely.
      let baseUrl = window.location.pathname;
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      
      let url = `${window.location.origin}${baseUrl}/api/all`;
      const res = await fetch(url);
      const data = await res.json();
      sm(data);
    }, 500);

    return () => clearInterval(id);
  }, []);

  return <div className='bg-red-100'>{JSON.stringify(m)}</div>;
}

export default App;
