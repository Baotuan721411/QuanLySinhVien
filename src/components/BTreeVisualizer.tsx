import { motion, AnimatePresence } from "motion/react";
import { BTreeNode } from "../lib/BTree";

interface BTreeVisualizerProps<T> {
  key?: string;
  node: BTreeNode<T>;
  x: number;
  y: number;
  levelWidth: number;
  levelHeight: number;
  highlightedNodeId: string | null;
  highlightedKey: string | null;
  insertedKey: { nodeId: string; key: string } | null;
  pendingKey: string | null;
}

export function BTreeVisualizer<T>({
  node,
  x,
  y,
  levelWidth,
  levelHeight,
  highlightedNodeId,
  highlightedKey,
  insertedKey,
  pendingKey,
}: BTreeVisualizerProps<T>) {
  const nodeHeight = 24;
  const keyWidth = 40;
  const k = node.keys.length;
  const totalNodeWidth = k * keyWidth;
  const isHighlighted = highlightedNodeId === node.id;

  // Helper to calculate the minimum required width of a subtree with minimal gap
  const getSubtreeWeight = (n: BTreeNode<T>): number => {
    const minNodeWidth = n.keys.length * keyWidth + 4; // Minimal 4px gap between siblings
    if (n.isLeaf) return minNodeWidth;
    const childrenWeight = n.children.reduce((acc, child) => acc + getSubtreeWeight(child), 0);
    return Math.max(minNodeWidth, childrenWeight);
  };

  const totalWeight = !node.isLeaf ? node.children.reduce((acc, child) => acc + getSubtreeWeight(child), 0) : 0;
  // Use the actual required weight if it's larger than the allocated levelWidth to prevent overlap
  const allocationWidth = Math.max(levelWidth, totalWeight);
  
  // Pre-calculate child positions to use in both lines and recursive calls
  const childPositions = !node.isLeaf ? (() => {
    let currentOffset = 0;
    return node.children.map((child) => {
      const childWeight = getSubtreeWeight(child);
      // Allocate space proportionally
      const childWidth = (childWeight / totalWeight) * allocationWidth;
      const pos = {
        x: x - allocationWidth / 2 + currentOffset + childWidth / 2,
        width: childWidth
      };
      currentOffset += childWidth;
      return pos;
    });
  })() : [];

  // Helper to format key to technical style
  const formatKey = (key: string) => {
    if (key.startsWith("SV")) return key.substring(2);
    return key;
  };

  return (
    <g>
      {/* Draw connections to children */}
      {!node.isLeaf &&
        node.children.map((child, i) => {
          const childPos = childPositions[i];
          const childX = childPos.x;
          const childY = y + levelHeight;
          
          // Start from the specific "pointer" position in the parent node
          // In a B-Tree, child i is between key i-1 and key i
          const startX = x - totalNodeWidth / 2 + i * keyWidth;
          const startY = y + nodeHeight / 2;

          return (
            <motion.line
              key={`branch-${node.id}-${child.id}`}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                x1: startX,
                y1: startY,
                x2: childX,
                y2: childY - nodeHeight / 2
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              stroke="#22c55e"
              strokeWidth="0.8"
            />
          );
        })}

      {/* Draw the node */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          x: x - totalNodeWidth / 2,
          y: y - nodeHeight / 2
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* ... (Highlight Glow and Main Node Box remain the same) */}
        {/* Highlight Glow */}
        <AnimatePresence>
          {isHighlighted && (
            <motion.rect
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              x={-2}
              y={-2}
              width={totalNodeWidth + 4}
              height={nodeHeight + 4}
              rx="2"
              fill="rgba(34, 197, 94, 0.1)"
              stroke="#22c55e"
              strokeWidth="1"
              strokeDasharray="4,2"
              className="pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Main Node Box */}
        <rect
          width={totalNodeWidth}
          height={nodeHeight}
          fill="#ffffff"
          stroke={isHighlighted ? "#16a34a" : "#22c55e"}
          strokeWidth="0.4"
        />
        
        {node.keys.map((key, i) => {
          const isPending = pendingKey === key;
          const isInserted = insertedKey?.nodeId === node.id && insertedKey?.key === key;
          const isKeyHighlighted = highlightedKey === key && isHighlighted;
          const shouldHide = isPending && !isInserted;

          return (
            <motion.g 
              key={`key-${key}`}
              animate={{ 
                opacity: shouldHide ? 0 : 1,
                x: i * keyWidth
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Vertical Divider */}
              {i > 0 && (
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={nodeHeight}
                  stroke="#22c55e"
                  strokeWidth="0.3"
                />
              )}
              
              <text
                x={keyWidth / 2}
                y={nodeHeight / 2 + 3.5}
                textAnchor="middle"
                className={`text-[9px] font-mono font-bold ${
                  isKeyHighlighted ? 'fill-green-800 underline' : 
                  isInserted ? 'fill-green-600' : 
                  'fill-green-700'
                }`}
              >
                {formatKey(key)}
              </text>
            </motion.g>
          );
        })}
      </motion.g>

      {/* Recursively draw children using space partitioning to prevent overlap */}
      {!node.isLeaf &&
        node.children.map((child, i) => {
          const childPos = childPositions[i];
          const childX = childPos.x;
          const childY = y + levelHeight;
          
          return (
            <BTreeVisualizer
              key={`child-${child.id}`}
              node={child}
              x={childX}
              y={childY}
              levelWidth={childPos.width}
              levelHeight={levelHeight}
              highlightedNodeId={highlightedNodeId}
              highlightedKey={highlightedKey}
              insertedKey={insertedKey}
              pendingKey={pendingKey}
            />
          );
        })}
    </g>
  );
}
