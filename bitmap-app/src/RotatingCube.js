import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';

const gridData = new Array(100).fill(new Array(60).fill(0)); // creates a 30x30 grid

const Cube = ({ position }) => {
  const mesh = useRef();

  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.x += 0.01;
      mesh.current.rotation.y += 0.01;
    }
  });

  return (
    <Box ref={mesh} position={position} scale={[0.5, 0.5, 0.5]} rotation={[0, Math.PI, 0]}>
      <meshStandardMaterial color={'#FF8C00'} />
    </Box>
  );
};

const RotatingCube = () => {
  return (
    <>
      {gridData.map((row, i) =>
        row.map((_, j) => (
          <Cube position={[i * 1.2, 0, j * 2]} key={`${i}-${j}`} />
        ))
      )}
    </>
  );
};

export default RotatingCube;
