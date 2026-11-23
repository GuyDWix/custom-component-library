import { useEffect } from 'react';
import './gallery.css';
import Grid from './Grid';
import Detail from './Detail';

export default function Gallery() {
  const view = new URLSearchParams(location.search).get('view');

  useEffect(() => {
    document.body.classList.add('gallery-body');
    return () => document.body.classList.remove('gallery-body');
  }, []);

  return <div className="gallery">{view ? <Detail name={view} /> : <Grid />}</div>;
}
