import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Canvas } from '@react-three/fiber';
import RotatingCube from './RotatingCube';
import { Helmet } from 'react-helmet';
import './App.css'; // Import the CSS file
import { inject } from '@vercel/analytics';
import { Fireworks } from '@fireworks-js/react';

 
inject()

const BitmapInfo = ({ countTotalBlocks, countClaimedBlocks }) => {
  return (
    <div className="bitmap-info">
      <h1>BLOCKOUT⛏️COUNTDOWN</h1>🟧🟧🟧🟧🟧🟧🟧🟧
      <h6>🟧 Total Blocks: {countTotalBlocks}</h6>
      <h6>⛏️ Claimed: {countClaimedBlocks}</h6>
      <br></br><div className="byline">bitmap.wtf by <a href="https://twitter.com/ordinalos">@ordinalos</a></div>
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
    const trac = io('https://index.bitmap.land', {
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
      <Fireworks
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      count={10} // Adjust the number of fireworks
      interval={2000} // Adjust the interval between fireworks
      colors={['#ff0000', '#00ff00', '#0000ff',]} // Adjust the colors of the fireworks
      calc={{
        x: (width) => Math.random() * width,
        y: (height) => Math.random() * height * 0.4, // Adjust the vertical position of the fireworks
      }}
    />
      <Canvas camera={{ position: [6, 4, 20], fov: 30 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 20]} intensity={0.5} />
        <RotatingCube key={updateKey} />
      </Canvas>
      <div className="available">
      <h3>{(countTotalBlocks - countClaimedBlocks).toLocaleString()}</h3>
      <div className="availabletag">available</div>
      </div>
      <BitmapInfo countTotalBlocks={countTotalBlocks} countClaimedBlocks={countClaimedBlocks} />
      <LoadingBar progress={loadingProgress} />
    </div>
  );
}

export default App;