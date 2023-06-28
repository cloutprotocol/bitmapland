import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Canvas } from '@react-three/fiber';
import RotatingCube from './RotatingCube';
import { Helmet } from 'react-helmet';
import './App.css'; // Import the CSS file

const BitmapInfo = ({ countTotalBlocks, countClaimedBlocks }) => {
  return (
    <div className="bitmap-info">
      <h1>BLOCKOUT⛏️COUNTDOWN</h1>🟧🟧🟧🟧🟧🟧🟧🟧
      <h6>🟧 Total Blocks: {countTotalBlocks}<br></br>
      ⛏️ Claimed: {countClaimedBlocks}</h6>
      <div className="available"><h3>{countTotalBlocks - countClaimedBlocks}</h3><div className="availabletag">available</div></div>
    </div>
  );
};

const LoadingBar = ({ progress }) => {
  const barStyle = {
    width: `${progress}%`,
  };

  return (
    <div className="App">
    <Helmet>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </Helmet>
    <div className="loading-bar-container">
      <div className="loading-bar" style={barStyle} />
    </div>
    </div>
  );
};

function App() {
  const [countTotalBlocks, setCountTotalBlocks] = useState(0);
  const [countClaimedBlocks, setCountClaimedBlocks] = useState(0);
  const [updateKey, setUpdateKey] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

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

    const dataIntervalId = setInterval(fetchData, 60000);
    const updateIntervalId = setInterval(() => {
      setUpdateKey((prevKey) => prevKey + 1);
    }, 20000);

    const loadingIntervalId = setInterval(() => {
      setLoadingProgress((prevProgress) => (prevProgress + 10) % 100);
    }, 3000);

    return () => {
      trac.disconnect();
      clearInterval(dataIntervalId);
      clearInterval(updateIntervalId);
      clearInterval(loadingIntervalId);
    };
  }, []);

  return (
    <div className="App" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [6, 4, 20], fov: 30 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 20]} intensity={0.5} />
        <RotatingCube key={updateKey} />
      </Canvas>
      <BitmapInfo countTotalBlocks={countTotalBlocks} countClaimedBlocks={countClaimedBlocks} />
      <LoadingBar progress={loadingProgress} />
      <footer style={{ fontSize: 'small' }}>
        bitmap.wtf © <a href="https://twitter.com/ordinalos">@ordinalOS</a>
      </footer>
    </div>
  );
}

export default App;