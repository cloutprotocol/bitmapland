// App.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Canvas } from '@react-three/fiber';
import RotatingCube from './RotatingCube';
import './App.css'; // Import the CSS file

const BitmapInfo = ({ countTotalBlocks, countClaimedBlocks }) => {
  return (
    <div className="bitmap-info">
      <h2>Blockout Timer 🟧🟧⬜⬜⛏️⛏️</h2>
      <p>Total Blocks: {countTotalBlocks}</p>
      <p>Claimed Blocks: {countClaimedBlocks}</p>
      <p>Available Blocks: {countTotalBlocks - countClaimedBlocks}</p>
    </div>
  );
};

function App() {
  const [countTotalBlocks, setCountTotalBlocks] = useState(0);
  const [countClaimedBlocks, setCountClaimedBlocks] = useState(0);

  useEffect(() => {
    const trac = io('https://bitmap.trac.network', {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 500,
      randomizationFactor: 0,
    });

    const fetchData = () => {
      trac.emit('get', {
        func: 'latestBlock',
        args: [],
        call_id: '',
      });

      trac.emit('get', {
        func: 'bitmapsLength',
        args: [],
        call_id: '',
      });
    };

    trac.on('response', (response) => {
      if (response.func === 'latestBlock') {
        setCountTotalBlocks(response.result);
      } else if (response.func === 'bitmapsLength') {
        setCountClaimedBlocks(response.result);
      }
    });

    trac.on('connect', fetchData);

    const intervalId = setInterval(fetchData, 5000);

    return () => {
      trac.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="App" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [20, 20, 40], fov: 10 }}>
        <ambientLight />
        <pointLight position={[10, 10, 20]} />
        <RotatingCube />
      </Canvas>
      <BitmapInfo countTotalBlocks={countTotalBlocks} countClaimedBlocks={countClaimedBlocks} />
      <footer style={{fontSize: 'small'}}>
        by <a href="https://twitter.com/ordinalos">@ordinalOS</a>
      </footer>
    </div>
  );
}

export default App;
