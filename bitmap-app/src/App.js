import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const BitmapInfo = () => {
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

    trac.on('response', (response) => {
      if (response.func === 'latestBlock') {
        setCountTotalBlocks(response.result);
      } else if (response.func === 'bitmapsLength') {
        setCountClaimedBlocks(response.result);
      }
    });

    trac.on('connect', () => {
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
    });

    return () => trac.disconnect();
  }, []);

  return (
    <div>
      <h2>Blockout Timer 🟧🟧🟧⬜⬜⛏️⛏️</h2>
      <p>Total Blocks: {countTotalBlocks}</p>
      <p>Claimed Blocks: {countClaimedBlocks}</p>
      <p>Available Blocks: {countTotalBlocks - countClaimedBlocks}</p>
    </div>
  );
};

function App() {
  return (
    <div className="App" style={{ padding: '40px' }}>
      <header className="App-header">
        <BitmapInfo />
      </header>
      <footer style={{fontSize: 'small'}}>
        by <a href="https://twitter.com/ordinalos">@ordinalOS</a>
      </footer>
    </div>
  );
}

export default App;