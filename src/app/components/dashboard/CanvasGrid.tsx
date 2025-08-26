function CanvasGrid() {
  // Two-layer grid: fine (20px) + bold (100px)
  const style: React.CSSProperties = {
    backgroundColor: "#0f1216",
    backgroundImage:
      "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)," +
      "linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)," +
      "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px)," +
      "linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
    backgroundSize: "20px 20px, 20px 20px, 100px 100px, 100px 100px",
    backgroundPosition: "0 0, 0 0, 0 0, 0 0",
  };

  return <div className="absolute inset-0" style={style} />;
}

export default CanvasGrid;