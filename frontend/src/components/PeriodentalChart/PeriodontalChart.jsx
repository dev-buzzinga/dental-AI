import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './PeriodontalChart.css';

const PeriodontalChart = ({ chartData, setChartData, mode = 'edit' }) => {
  const upperTeeth = chartData.slice(0, 16); // Teeth 1-16
  const lowerTeeth = chartData.slice(16, 32); // Teeth 17-32

  // Update tooth data
  const updateTooth = (toothIndex, field, value) => {
    if (mode === 'view') return; // Read-only mode
    
    const newChartData = [...chartData];
    newChartData[toothIndex] = {
      ...newChartData[toothIndex],
      [field]: value
    };
    setChartData(newChartData);
  };

  // Update site-specific data (plaque, bop, gr, pd)
  const updateSiteData = (toothIndex, field, siteIndex, value) => {
    if (mode === 'view') return;
    
    const newChartData = [...chartData];
    const tooth = { ...newChartData[toothIndex] };
    const siteData = [...tooth[field]];
    siteData[siteIndex] = value;
    tooth[field] = siteData;
    newChartData[toothIndex] = tooth;
    setChartData(newChartData);
  };

  // Toggle implant status
  const toggleImplant = (toothIndex) => {
    if (mode === 'view') return;
    updateTooth(toothIndex, 'isImplant', !chartData[toothIndex].isImplant);
  };

  // Prepare data for area chart (GR and PD)
  const prepareChartData = (teeth, field) => {
    return teeth.map(tooth => ({
      tooth: tooth.number,
      buccal: (tooth[field][0] + tooth[field][1] + tooth[field][2]) / 3,
      lingual: (tooth[field][3] + tooth[field][4] + tooth[field][5]) / 3
    }));
  };

  // Render tooth component
  const ToothComponent = ({ tooth, toothIndex }) => {
    const isImplant = tooth.isImplant;
    const hasPlaque = tooth.plaque.some(p => p);
    const hasBleeding = tooth.bop.some(b => b);

    return (
      <div className="tooth-container">
        {/* Tooth Number */}
        <div className="tooth-number">{tooth.number}</div>

        {/* Site inputs for Buccal (MB, B, DB) */}
        <div className="sites-row buccal">
          {[0, 1, 2].map(siteIndex => (
            <div key={siteIndex} className="site-group">
              {/* GR input */}
              <input
                type="number"
                className="site-input gr-input"
                value={tooth.gr[siteIndex]}
                onChange={(e) => updateSiteData(toothIndex, 'gr', siteIndex, parseFloat(e.target.value) || 0)}
                disabled={isImplant || mode === 'view'}
                min="0"
                max="15"
              />
              {/* PD input */}
              <input
                type="number"
                className="site-input pd-input"
                value={tooth.pd[siteIndex]}
                onChange={(e) => updateSiteData(toothIndex, 'pd', siteIndex, parseFloat(e.target.value) || 1)}
                disabled={isImplant || mode === 'view'}
                min="1"
                max="15"
              />
            </div>
          ))}
        </div>

        {/* Tooth Image/Visual */}
        <div 
          className={`tooth-visual ${isImplant ? 'implant' : ''} ${hasPlaque ? 'plaque' : ''} ${hasBleeding ? 'bleeding' : ''}`}
          onClick={() => toggleImplant(toothIndex)}
          title={isImplant ? 'Click to mark as natural tooth' : 'Click to mark as implant'}
        >
          <div className="tooth-icon">
            {isImplant ? '🔩' : '🦷'}
          </div>
        </div>

        {/* Mobility and Furcation */}
        <div className="tooth-controls">
          <div className="control-group">
            <label>M</label>
            <input
              type="number"
              className="small-input"
              value={tooth.mobility}
              onChange={(e) => updateTooth(toothIndex, 'mobility', parseInt(e.target.value) || 0)}
              disabled={isImplant || mode === 'view'}
              min="0"
              max="3"
            />
          </div>
          <div className="control-group">
            <label>F</label>
            <select
              className="small-select"
              value={tooth.furcation}
              onChange={(e) => updateTooth(toothIndex, 'furcation', e.target.value)}
              disabled={isImplant || mode === 'view'}
            >
              <option value="None">-</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
        </div>

        {/* Plaque indicators (6 checkboxes) */}
        <div className="indicators-row plaque-indicators">
          {tooth.plaque.map((checked, idx) => (
            <input
              key={idx}
              type="checkbox"
              checked={checked}
              onChange={(e) => updateSiteData(toothIndex, 'plaque', idx, e.target.checked)}
              disabled={isImplant || mode === 'view'}
              title={`Plaque site ${idx + 1}`}
            />
          ))}
        </div>

        {/* BOP indicators (6 checkboxes) */}
        <div className="indicators-row bop-indicators">
          {tooth.bop.map((checked, idx) => (
            <input
              key={idx}
              type="checkbox"
              checked={checked}
              onChange={(e) => updateSiteData(toothIndex, 'bop', idx, e.target.checked)}
              disabled={isImplant || mode === 'view'}
              title={`BOP site ${idx + 1}`}
            />
          ))}
        </div>

        {/* Site inputs for Lingual (ML, L, DL) */}
        <div className="sites-row lingual">
          {[3, 4, 5].map(siteIndex => (
            <div key={siteIndex} className="site-group">
              {/* PD input */}
              <input
                type="number"
                className="site-input pd-input"
                value={tooth.pd[siteIndex]}
                onChange={(e) => updateSiteData(toothIndex, 'pd', siteIndex, parseFloat(e.target.value) || 1)}
                disabled={isImplant || mode === 'view'}
                min="1"
                max="15"
              />
              {/* GR input */}
              <input
                type="number"
                className="site-input gr-input"
                value={tooth.gr[siteIndex]}
                onChange={(e) => updateSiteData(toothIndex, 'gr', siteIndex, parseFloat(e.target.value) || 0)}
                disabled={isImplant || mode === 'view'}
                min="0"
                max="15"
              />
            </div>
          ))}
        </div>

        {/* Furcation Lingual */}
        <div className="furcation-lingual">
          <label>FL</label>
          <select
            className="small-select"
            value={tooth.furcationLingual}
            onChange={(e) => updateTooth(toothIndex, 'furcationLingual', e.target.value)}
            disabled={isImplant || mode === 'view'}
          >
            <option value="None">-</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="periodontal-chart">
      {/* Legend */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-label">GR:</span> Gingival Recession
        </div>
        <div className="legend-item">
          <span className="legend-label">PD:</span> Pocket Depth
        </div>
        <div className="legend-item">
          <span className="legend-label">M:</span> Mobility (0-3)
        </div>
        <div className="legend-item">
          <span className="legend-label">F:</span> Furcation
        </div>
        <div className="legend-item">
          <span className="legend-label">FL:</span> Furcation Lingual
        </div>
        <div className="legend-item">
          <span className="legend-color plaque-color"></span> Plaque
        </div>
        <div className="legend-item">
          <span className="legend-color bop-color"></span> BOP (Bleeding on Probing)
        </div>
      </div>

      {/* Upper Teeth Section */}
      <div className="teeth-section upper-section">
        <h3 className="section-title">Upper Teeth (1-16)</h3>
        
        {/* Area Chart for Upper Teeth - GR */}
        <div className="area-chart-container">
          <h4>Gingival Recession (GR)</h4>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={prepareChartData(upperTeeth, 'gr')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tooth" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="buccal" stackId="1" stroke="#8884d8" fill="#8884d8" name="Buccal" />
              <Area type="monotone" dataKey="lingual" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Lingual" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Area Chart for Upper Teeth - PD */}
        <div className="area-chart-container">
          <h4>Pocket Depth (PD)</h4>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={prepareChartData(upperTeeth, 'pd')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tooth" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="buccal" stackId="1" stroke="#ff7300" fill="#ff7300" name="Buccal" />
              <Area type="monotone" dataKey="lingual" stackId="2" stroke="#387908" fill="#387908" name="Lingual" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Upper Teeth Grid */}
        <div className="teeth-grid">
          {upperTeeth.map((tooth, idx) => (
            <ToothComponent key={tooth.id} tooth={tooth} toothIndex={idx} />
          ))}
        </div>
      </div>

      {/* Lower Teeth Section */}
      <div className="teeth-section lower-section">
        <h3 className="section-title">Lower Teeth (17-32)</h3>
        
        {/* Lower Teeth Grid */}
        <div className="teeth-grid">
          {lowerTeeth.map((tooth, idx) => (
            <ToothComponent key={tooth.id} tooth={tooth} toothIndex={idx + 16} />
          ))}
        </div>

        {/* Area Chart for Lower Teeth - PD */}
        <div className="area-chart-container">
          <h4>Pocket Depth (PD)</h4>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={prepareChartData(lowerTeeth, 'pd')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tooth" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="buccal" stackId="1" stroke="#ff7300" fill="#ff7300" name="Buccal" />
              <Area type="monotone" dataKey="lingual" stackId="2" stroke="#387908" fill="#387908" name="Lingual" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Area Chart for Lower Teeth - GR */}
        <div className="area-chart-container">
          <h4>Gingival Recession (GR)</h4>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={prepareChartData(lowerTeeth, 'gr')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tooth" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="buccal" stackId="1" stroke="#8884d8" fill="#8884d8" name="Buccal" />
              <Area type="monotone" dataKey="lingual" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Lingual" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PeriodontalChart;
