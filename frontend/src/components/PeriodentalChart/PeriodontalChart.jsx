import React from 'react';
import { TOOTH_IMG_URL } from '../utils/teeth';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import './PeriodontalChart.css';

const horizontalLines = [2, 4, 6, 8, 10, 12, 14, 16];

const SITE_LABELS = ['MB', 'B', 'DB', 'ML', 'L', 'DL'];

// const upperFields = [
//   { label: 'Mobility', cells: 1, className: 'mobility-cell' },
//   { label: 'Implant', cells: 1, className: 'implant-cell' },
//   { label: 'Furcation', cells: 1, className: 'furcation-cell' },
//   { label: 'Plaque', cells: 3, className: 'plaque-cell' },
//   { label: 'BOP', cells: 3, className: 'bop-cell' },
//   { label: 'GR', cells: 3, className: 'gr-cell' },
//   { label: 'PD', cells: 3, className: 'pd-cell' }
// ];


const mapValueToY = (val, max = 10, height = 40) => {
  return height - (val / max) * height;
};


const renderChartLines = (teeth) => {
  const spacing = 30; // space between each tooth
  const subSpacing = 6; // space between MB, B, DB (or ML, L, DL)

  const grPoints = [];
  const pdPoints = [];

  teeth.forEach((tooth, i) => {
    if (!tooth) return;

    const baseX = i * spacing;

    tooth.gr.forEach((val, j) => {
      const x = baseX + j * subSpacing;
      const y = mapValueToY(val);
      grPoints.push(`${x},${y}`);
    });

    tooth.pd.forEach((val, j) => {
      const x = baseX + j * subSpacing;
      const y = mapValueToY(val);
      pdPoints.push(`${x},${y}`);
    });
  });

  return (
    <svg className="absolute top-0 left-0 z-10 pointer-events-none" width="100%" height="40">
      <polyline points={grPoints.join(' ')} fill="none" stroke="blue" strokeWidth={2} />
      <polyline points={pdPoints.join(' ')} fill="none" stroke="red" strokeWidth={2} />
    </svg>
  );
};


function getToothImage(tooth, isUpper) {
  
  let tNumber = tooth.id;

  if (!isUpper) {
    tNumber = tooth.id - 16;
  }
  const base = `t${tNumber}_${isUpper ? 'U' : 'L'}`;

  if (tooth.isImplant) return TOOTH_IMG_URL[`${base}_Implant`];

  const hasPlaque = tooth.plaque.slice(0, 3).some(Boolean);
  const hasBOP = tooth.bop.slice(0, 3).some(Boolean);

  if (hasPlaque && hasBOP) return TOOTH_IMG_URL[`${base}_Plaque_Bleed`];
  if (hasPlaque) return TOOTH_IMG_URL[`${base}_Plaque`];
  if (hasBOP) return TOOTH_IMG_URL[`${base}_Bleed`];

  return TOOTH_IMG_URL[base];
}

const Tooth = ({ tooth, isUpper }) => {
  const imgUrl = getToothImage(tooth, isUpper);

  if (isUpper) {
    return (
      <div style={{ textAlign: 'center' }}>
      <img src={imgUrl} alt="tooth" style={{ height: "250px" }} />
      <div style={{ fontSize: 12 }}>{tooth.id}</div>

    </div>
    )
  }
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12 }}>{tooth.id}</div>
      <img src={imgUrl} alt="tooth" style={{ height: "250px" }} />

    </div>
  );
};

const upperFields = [
  { label: 'Mobility', cells: 1, className: 'mobility-cell' },
  { label: 'Implant', cells: 1, className: 'implant-cell' },
  { label: 'Furcation', cells: 1, className: 'furcation-cell' },
  { label: 'Plaque', cells: 3, className: 'plaque-cell' },
  { label: 'BOP', cells: 3, className: 'bop-cell' },
  { label: 'GR', cells: 3, className: 'gr-cell' },
  { label: 'PD', cells: 3, className: 'pd-cell' },
];

const lowerFields = [
  { label: 'Furcation', cells: 1, className: 'furcation-cell' },
  { label: 'Plaque', cells: 3, className: 'plaque-cell' },
  { label: 'BOP', cells: 3, className: 'bop-cell' },
  { label: 'GR', cells: 3, className: 'gr-cell' },
  { label: 'PD', cells: 3, className: 'pd-cell' },
];

const getSiteColor = (val) => {
  if (val >= 5) return '#d32f2f';
  if (val >= 3) return '#fbc02d';
  if (val >= 1) return '#388e3c';
  return '#ccc';
};

const PeriodontalChart = ({ chartData, setChartData }) => {
  const upperTeeth = chartData.slice(0, 16);
  const lowerTeeth = chartData.slice(16, 32);

  const handleToggle = (toothIdx, field, siteIdx = null) => {
    const updated = [...chartData];
    const tooth = { ...updated[toothIdx] };

    if (field === 'implant') {
      tooth.isImplant = !tooth.isImplant;
      if (tooth.isImplant) {
        tooth.mobility = 0;
        tooth.furcation = '0';
        tooth.bop = [false, false, false, false, false, false];
        tooth.pd = [0, 0, 0, 0, 0, 0];
        tooth.gr = [0, 0, 0, 0, 0, 0];
      }
    } else if (field === 'mobility') {
      tooth.mobility = (tooth.mobility + 1) % 4;
    } else if (field === 'furcation') {
      const values = ['0', '1', '2', '3'];
      const i = values.indexOf(tooth.furcation);
      tooth.furcation = values[(i + 1) % values.length];
    } else if (field === 'furcationLingual') {
      const values = ['0', '1', '2', '3'];
      const i = values.indexOf(tooth.furcationLingual);
      tooth.furcationLingual = values[(i + 1) % values.length];
    } else if (['plaque', 'bop'].includes(field)) {
      tooth[field][siteIdx] = !tooth[field][siteIdx];
    }

    updated[toothIdx] = tooth;
    setChartData(updated);
  };

  const handleInputChange = (toothIdx, field, siteIdx, value) => {
    const updated = [...chartData];
    const tooth = { ...updated[toothIdx] };
    tooth[field][siteIdx] = Number(value);
    updated[toothIdx] = tooth;
    setChartData(updated);
  };


  const getUpperAreaData = () => {
    const areaData = upperTeeth.map((tooth, index) => ({
      name: `Tooth ${tooth.id}`,
      gr: tooth.gr.reduce((a, b) => a + b, 0),
      pd: tooth.pd.reduce((a, b) => a + b, 0),
    }));

    return areaData;
  }

  const getLowerAreaData = () => {
    const areaData = lowerTeeth.map((tooth, index) => ({
      name: `Tooth ${tooth.id}`,
      gr: tooth.gr.reduce((a, b) => a + b, 0),
      pd: tooth.pd.reduce((a, b) => a + b, 0),
    }));

    return areaData;
  }
  return (
    <div className="periodontal-chart-root" style={{ width: '100%', margin: '0 auto' }}>
      {/* Upper Teeth Buccal Table */}
      <div style={{ width: '100%' }}>
        <table className="chart-table" style={{ width: '100%', minWidth: 960, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 2, minWidth: 90, maxWidth: 120, width: 50, textAlign: 'right', paddingRight: '4px' }}></th>
              {upperTeeth.map((_, idx) => (
                <th key={idx} style={{ minWidth: 50, maxWidth: 80, width: 50, textAlign: 'center', fontWeight: 500, padding: '6px 2px', border: '1px solid #ccc' }}>MB B DB</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {upperFields.map(({ label, cells, className }) => (
              <tr key={label}>
                <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, minWidth: 90, maxWidth: 120, width: 50, textAlign: 'right', fontWeight: 500, paddingRight: '4px' }}>{label}</td>
                {upperTeeth.map((tooth, toothIdx) => {
                  const isDisabled = tooth.isImplant && ['Mobility', 'Furcation', 'BOP', 'GR', 'PD'].includes(label);
                  const siteStart = 0; // Buccal side (MB, B, DB)
                  return (
                    <td key={toothIdx} style={{ textAlign: 'center', padding: 0, border: '1px solid #ccc', padding: '2px 2px', verticalAlign: 'middle', minWidth: 50, maxWidth: 80, width: 50, }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '4px 0px' }}>
                        {Array.from({ length: cells }).map((_, siteIdx) => {
                          const globalSiteIdx = siteStart + siteIdx;
                          let style = {
                            backgroundColor: '#eee',
                            boxSizing: 'border-box',
                            width: '16px',
                            height: '20px',
                            fontSize: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                          };
                          if (label === 'Implant') {
                            style.backgroundColor = tooth.isImplant ? '#2196f3' : '#eee';
                          } else if (label === 'Mobility') {
                            style = { ...style, backgroundColor: '#fff', fontWeight: 600 };
                          } else if (label === 'Furcation') {
                            const percent = parseInt(tooth.furcation) * 33;
                            style.background = `linear-gradient(to top, #8bc34a ${percent}%, #eee ${percent}%)`;
                          } else if (label === 'Plaque') {
                            style.backgroundColor = tooth.plaque[globalSiteIdx] ? 'yellow' : '#eee';
                          } else if (label === 'BOP') {
                            style.backgroundColor = tooth.bop[globalSiteIdx] ? 'red' : '#eee';
                          }
                          if (label === 'GR' || label === 'PD') {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', paddingRight: '2px' }} key={siteIdx}>
                                <input
                                  type="number"
                                  value={tooth[label.toLowerCase()][globalSiteIdx]}
                                  onChange={(e) => handleInputChange(toothIdx, label.toLowerCase(), globalSiteIdx, e.target.value)}
                                  disabled={isDisabled}
                                  style={{ width: '90%', height: '20px', textAlign: 'center', fontSize: 10, border: '1px solid #ccc', borderRadius: 4, margin: '0 4%' }}
                                  className='hide-spinner'
                                />
                              </div>
                            );
                          }
                          return (
                            <span
                              key={siteIdx}
                              className={`cell ${className}`}
                              style={style}
                              onClick={() => {
                                if (isDisabled) return;
                                if (label === 'Implant') handleToggle(toothIdx, 'implant');
                                if (label === 'Mobility') handleToggle(toothIdx, 'mobility');
                                if (label === 'Furcation') handleToggle(toothIdx, 'furcation');
                                if (label === 'Plaque') handleToggle(toothIdx, 'plaque', globalSiteIdx);
                                if (label === 'BOP') handleToggle(toothIdx, 'bop', globalSiteIdx);
                              }}
                            >
                              {label === 'Mobility' ? tooth.mobility : ''}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upper Teeth Lingual Table */}
      {/* <table className="chart-table" style={{ width: '100%', minWidth: 960, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 10, marginTop: '24px' }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 2, minWidth: 90, maxWidth: 120, width: 50, textAlign: 'right', paddingRight: '4px' }}></th>
            {upperTeeth.map((_, idx) => (
              <th key={idx} style={{ minWidth: 50, maxWidth: 80, width: 50, textAlign: 'center', fontWeight: 500, padding: '6px 2px', border: '1px solid #ccc' }}>ML L DL</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lowerFields.map(({ label, cells, className }) => (
            <tr key={label}>
              <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, minWidth: 90, maxWidth: 120, width: 50, textAlign: 'right', fontWeight: 500, paddingRight: '4px' }}>{label}</td>
              {upperTeeth.map((tooth, toothIdx) => {
                const isDisabled = tooth.isImplant && ['Mobility', 'Furcation', 'BOP', 'GR', 'PD'].includes(label);
                const siteStart = 3; // Lingual side (ML, L, DL)
                return (
                  <td key={toothIdx} style={{ textAlign: 'center', padding: 0, border: '1px solid #ccc', padding: '2px 2px', verticalAlign: 'middle', minWidth: 50, maxWidth: 80, width: 50, }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '4px 0px' }}>
                      {Array.from({ length: cells }).map((_, siteIdx) => {
                        const globalSiteIdx = siteStart + siteIdx;
                        let style = {
                          backgroundColor: '#eee',
                          boxSizing: 'border-box',
                          width: '16px',
                          height: '20px',
                          fontSize: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #ccc',
                          borderRadius: 4,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                        };
                        if (label === 'Implant') {
                          style.backgroundColor = tooth.isImplant ? '#2196f3' : '#eee';
                        } else if (label === 'Mobility') {
                          style = { ...style, backgroundColor: '#fff', fontWeight: 600 };
                        } else if (label === 'Furcation') {
                          const percent = parseInt(tooth.furcationLingual) * 33;
                          style.background = `linear-gradient(to top, #8bc34a ${percent}%, #eee ${percent}%)`;
                        } else if (label === 'Plaque') {
                          style.backgroundColor = tooth.plaque[globalSiteIdx] ? 'yellow' : '#eee';
                        } else if (label === 'BOP') {
                          style.backgroundColor = tooth.bop[globalSiteIdx] ? 'red' : '#eee';
                        }
                        if (label === 'GR' || label === 'PD') {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', paddingRight: '2px' }} key={siteIdx}>
                              <input
                                type="number"
                                value={tooth[label.toLowerCase()][globalSiteIdx]}
                                onChange={(e) => handleInputChange(toothIdx, label.toLowerCase(), globalSiteIdx, e.target.value)}
                                disabled={isDisabled}
                                style={{ width: '90%', height: '20px', textAlign: 'center', fontSize: 10, border: '1px solid #ccc', borderRadius: 4, margin: '0 4%' }}
                                className='hide-spinner'
                              />
                            </div>
                          );
                        }
                        return (
                          <span
                            key={siteIdx}
                            className={`cell ${className}`}
                            style={style}
                            onClick={() => {
                              if (isDisabled) return;
                              if (label === 'Implant') handleToggle(toothIdx, 'implant');
                              if (label === 'Mobility') handleToggle(toothIdx, 'mobility');
                              if (label === 'Furcation') handleToggle(toothIdx, 'furcationLingual');
                              if (label === 'Plaque') handleToggle(toothIdx, 'plaque', globalSiteIdx);
                              if (label === 'BOP') handleToggle(toothIdx, 'bop', globalSiteIdx);
                            }}
                          >
                            {label === 'Mobility' ? tooth.mobility : ''}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table> */}


      <div style={{ position: 'relative',   width: "-webkit-fill-available", marginLeft: "70px" }}>
        {/* Chart in background */}
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={getUpperAreaData()}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <YAxis domain={[0, 16]} hide />
            <XAxis tick={false} axisLine={false} tickLine={false} />

            {/* Grid lines behind chart */}
            {horizontalLines.map((y, index) => (
              <ReferenceLine
                key={index}
                y={y}
                stroke="#ccc"
                strokeDasharray="3 3"
                ifOverflow="visible"
              />
            ))}

            <Area
              type="monotone"
              dataKey="gr"
              stackId="0"
              stroke="#a3a8fa"
              fill="#a3a8fa"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="pd"
              stackId="1"
              stroke="#f9cdce"
              fill="#f9cdce"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Teeth images on top of chart */}
        <div
          style={{
            position: 'absolute',
            top: 42,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            pointerEvents: 'none',
          }}
        >
          {upperTeeth.map((tooth) => (
            <Tooth key={tooth.id} tooth={tooth} isUpper={true} />
          ))}
        </div>
      </div>
      <table
        className="chart-table"
        style={{
          width: '100%',
          minWidth: 960,
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          fontSize: 10,
          marginTop: '150px'
        }}
      >
        <thead>
          <tr>
            <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 2, minWidth: 90, maxWidth: 120, width: 50, textAlign: 'right', paddingRight: '4px' }}></th>
            {upperTeeth.map((_, idx) => (
              <th key={idx} style={{ minWidth: 50, maxWidth: 80, width: 50, textAlign: 'center', fontWeight: 500, padding: '6px 2px', border: '1px solid #ccc' }}>ML L DL</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lowerFields.map(({ label, cells, className }) => (
            <tr key={label}>
              <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, minWidth: 90, maxWidth: 120, width: 50, textAlign: 'right', fontWeight: 500, paddingRight: '4px' }}>
                {label}
              </td>
              {upperTeeth.map((tooth, toothIdx) => {
                const isDisabled = tooth.isImplant && ['Mobility', 'Furcation', 'BOP', 'GR', 'PD'].includes(label);
                const siteStart = 3; // Lingual side (ML, L, DL)
                return (
                  <td key={toothIdx} style={{ textAlign: 'center', padding: 0, border: '1px solid #ccc', padding: '2px 2px', verticalAlign: 'middle', minWidth: 50, maxWidth: 80, width: 50, }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '4px 0px' }}>
                      {Array.from({ length: cells }).map((_, siteIdx) => {
                        const globalSiteIdx = siteStart + siteIdx;
                        let style = {
                          backgroundColor: '#eee',
                          boxSizing: 'border-box',
                          width: '16px',
                          height: '20px',
                          fontSize: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #ccc',
                          borderRadius: 4,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                        };
                        if (label === 'Implant') {
                          style.backgroundColor = tooth.isImplant ? '#2196f3' : '#eee';
                        } else if (label === 'Mobility') {
                          style = {
                            ...style,
                            backgroundColor: '#fff',
                            fontWeight: 600,
                          };
                        } else if (label === 'Furcation') {
                          const percent = parseInt(tooth.furcationLingual) * 33;
                          style.background = `linear-gradient(to top, #8bc34a ${percent}%, #eee ${percent}%)`;
                        } else if (label === 'Plaque') {
                          style.backgroundColor = tooth.plaque[globalSiteIdx] ? 'yellow' : '#eee';
                        } else if (label === 'BOP') {
                          style.backgroundColor = tooth.bop[globalSiteIdx] ? 'red' : '#eee';
                        }
                        if (label === 'GR' || label === 'PD') {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', paddingRight: '2px' }} key={siteIdx}>
                              <input
                                type="number"
                                value={tooth[label.toLowerCase()][globalSiteIdx]}
                                onChange={(e) => handleInputChange(toothIdx, label.toLowerCase(), globalSiteIdx, e.target.value)}
                                disabled={isDisabled}
                                style={{
                                  width: '90%',
                                  height: '20px',
                                  textAlign: 'center',
                                  fontSize: 10,
                                  border: '1px solid #ccc',
                                  borderRadius: 4,
                                  margin: '0 4%',
                                }}
                                className='hide-spinner'
                              />
                            </div>
                          );
                        }
                        return (
                          <span
                            key={siteIdx}
                            className={`cell ${className}`}
                            style={style}
                            onClick={() => {
                              if (isDisabled) return;
                              if (label === 'Implant') handleToggle(toothIdx, 'implant');
                              if (label === 'Mobility') handleToggle(toothIdx, 'mobility');
                              if (label === 'Furcation') handleToggle(toothIdx, 'furcationLingual');
                              if (label === 'Plaque') handleToggle(toothIdx, 'plaque', globalSiteIdx);
                              if (label === 'BOP') handleToggle(toothIdx, 'bop', globalSiteIdx);
                            }}
                          >
                            {label === 'Mobility' ? tooth.mobility : ''}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

            {/* Lower Teeth Buccal Table */}
            <div style={{ width: '100%', marginTop: '48px' }}>
        <table className="chart-table" style={{ width: '100%', minWidth: 960, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 2, minWidth: 90, maxWidth: 120, width: 50, textAlign: 'right', paddingRight: '4px' }}></th>
              {lowerTeeth.map((_, idx) => (
                <th key={idx} style={{ minWidth: 50, maxWidth: 80, width: 50, textAlign: 'center', fontWeight: 500, padding: '6px 2px', border: '1px solid #ccc' }}>MB B DB</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {upperFields.map(({ label, cells, className }) => (
              <tr key={label}>
                <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, minWidth: 90, maxWidth: 120, width: 50, textAlign: 'right', fontWeight: 500, paddingRight: '4px' }}>{label}</td>
                {lowerTeeth.map((tooth, toothIdx) => {
                  const isDisabled = tooth.isImplant && ['Mobility', 'Furcation', 'BOP', 'GR', 'PD'].includes(label);
                  const siteStart = 0; // Buccal side (MB, B, DB)
                  return (
                    <td key={toothIdx} style={{ textAlign: 'center', padding: 0, border: '1px solid #ccc', padding: '2px 2px', verticalAlign: 'middle', minWidth: 50, maxWidth: 80, width: 50, }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '4px 0px' }}>
                        {Array.from({ length: cells }).map((_, siteIdx) => {
                          const globalSiteIdx = siteStart + siteIdx;
                          let style = {
                            backgroundColor: '#eee',
                            boxSizing: 'border-box',
                            width: '16px',
                            height: '20px',
                            fontSize: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                          };
                          if (label === 'Implant') {
                            style.backgroundColor = tooth.isImplant ? '#2196f3' : '#eee';
                          } else if (label === 'Mobility') {
                            style = { ...style, backgroundColor: '#fff', fontWeight: 600 };
                          } else if (label === 'Furcation') {
                            const percent = parseInt(tooth.furcation) * 33;
                            style.background = `linear-gradient(to top, #8bc34a ${percent}%, #eee ${percent}%)`;
                          } else if (label === 'Plaque') {
                            style.backgroundColor = tooth.plaque[globalSiteIdx] ? 'yellow' : '#eee';
                          } else if (label === 'BOP') {
                            style.backgroundColor = tooth.bop[globalSiteIdx] ? 'red' : '#eee';
                          }
                          if (label === 'GR' || label === 'PD') {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', paddingRight: '2px' }} key={siteIdx}>
                                <input
                                  type="number"
                                  value={tooth[label.toLowerCase()][globalSiteIdx]}
                                  onChange={(e) => handleInputChange(16 + toothIdx, label.toLowerCase(), globalSiteIdx, e.target.value)}
                                  disabled={isDisabled}
                                  style={{ width: '90%', height: '20px', textAlign: 'center', fontSize: 10, border: '1px solid #ccc', borderRadius: 4, margin: '0 4%' }}
                                  className='hide-spinner'
                                />
                              </div>
                            );
                          }
                          return (
                            <span
                              key={siteIdx}
                              className={`cell ${className}`}
                              style={style}
                              onClick={() => {
                                if (isDisabled) return;
                                if (label === 'Implant') handleToggle(16 + toothIdx, 'implant');
                                if (label === 'Mobility') handleToggle(16 + toothIdx, 'mobility');
                                if (label === 'Furcation') handleToggle(16 + toothIdx, 'furcation');
                                if (label === 'Plaque') handleToggle(16 + toothIdx, 'plaque', globalSiteIdx);
                                if (label === 'BOP') handleToggle(16 + toothIdx, 'bop', globalSiteIdx);
                              }}
                            >
                              {label === 'Mobility' ? tooth.mobility : ''}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ position: 'relative', width: '-webkit-fill-available', marginLeft: '70px', paddingTop: '150px' }}>
        {/* Chart in background */}
        <ResponsiveContainer
          width="100%"
          height={200}
          style={{ transform: 'rotate(180deg)' }}
        >
          <AreaChart
            data={getLowerAreaData()}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <YAxis domain={[0, 16]} hide />
            <XAxis tick={false} axisLine={false} tickLine={false} />

            {/* Grid lines behind chart */}
            {horizontalLines.map((y, index) => (
              <ReferenceLine
                key={index}
                y={y}
                stroke="#ccc"
                strokeDasharray="3 3"
                ifOverflow="visible"
              />
            ))}

            <Area
              type="monotone"
              dataKey="gr"
              stackId="0"
              stroke="#a3a8fa"
              fill="#a3a8fa"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="pd"
              stackId="1"
              stroke="#f9cdce"
              fill="#f9cdce"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Teeth images on top of chart */}
        <div
          style={{
            position: 'absolute',
            top: 42,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            pointerEvents: 'none',
          }}
        >
          {lowerTeeth.map((tooth) => (
            <Tooth key={tooth.id} tooth={tooth} isUpper={false} />
          ))}
        </div>
      </div>

      {/* Lower Teeth Lingual Table */}
      <table className="chart-table" style={{ width: '100%', minWidth: 960, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: 10, marginTop: '150px' }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 2, minWidth: 90, maxWidth: 120, width: 50, textAlign: 'right', paddingRight: '4px' }}></th>
            {lowerTeeth.map((_, idx) => (
              <th key={idx} style={{ minWidth: 50, maxWidth: 80, width: 50, textAlign: 'center', fontWeight: 500, padding: '6px 2px', border: '1px solid #ccc' }}>ML L DL</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lowerFields.map(({ label, cells, className }) => (
            <tr key={label}>
              <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, minWidth: 90, maxWidth: 120, width: 50, textAlign: 'right', fontWeight: 500, paddingRight: '4px' }}>{label}</td>
              {lowerTeeth.map((tooth, toothIdx) => {
                const isDisabled = tooth.isImplant && ['Mobility', 'Furcation', 'BOP', 'GR', 'PD'].includes(label);
                const siteStart = 3; // Lingual side (ML, L, DL)
                return (
                  <td key={toothIdx} style={{ textAlign: 'center', padding: 0, border: '1px solid #ccc', padding: '2px 2px', verticalAlign: 'middle', minWidth: 50, maxWidth: 80, width: 50, }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '4px 0px' }}>
                      {Array.from({ length: cells }).map((_, siteIdx) => {
                        const globalSiteIdx = siteStart + siteIdx;
                        let style = {
                          backgroundColor: '#eee',
                          boxSizing: 'border-box',
                          width: '16px',
                          height: '20px',
                          fontSize: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #ccc',
                          borderRadius: 4,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                        };
                        if (label === 'Implant') {
                          style.backgroundColor = tooth.isImplant ? '#2196f3' : '#eee';
                        } else if (label === 'Mobility') {
                          style = { ...style, backgroundColor: '#fff', fontWeight: 600 };
                        } else if (label === 'Furcation') {
                          const percent = parseInt(tooth.furcationLingual) * 33;
                          style.background = `linear-gradient(to top, #8bc34a ${percent}%, #eee ${percent}%)`;
                        } else if (label === 'Plaque') {
                          style.backgroundColor = tooth.plaque[globalSiteIdx] ? 'yellow' : '#eee';
                        } else if (label === 'BOP') {
                          style.backgroundColor = tooth.bop[globalSiteIdx] ? 'red' : '#eee';
                        }
                        if (label === 'GR' || label === 'PD') {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', paddingRight: '2px' }} key={siteIdx}>
                              <input
                                type="number"
                                value={tooth[label.toLowerCase()][globalSiteIdx]}
                                onChange={(e) => handleInputChange(16 + toothIdx, label.toLowerCase(), globalSiteIdx, e.target.value)}
                                disabled={isDisabled}
                                style={{ width: '90%', height: '20px', textAlign: 'center', fontSize: 10, border: '1px solid #ccc', borderRadius: 4, margin: '0 4%' }}
                                className='hide-spinner'
                              />
                            </div>
                          );
                        }
                        return (
                          <span
                            key={siteIdx}
                            className={`cell ${className}`}
                            style={style}
                            onClick={() => {
                              if (isDisabled) return;
                              if (label === 'Implant') handleToggle(16 + toothIdx, 'implant');
                              if (label === 'Mobility') handleToggle(16 + toothIdx, 'mobility');
                              if (label === 'Furcation') handleToggle(16 + toothIdx, 'furcationLingual');
                              if (label === 'Plaque') handleToggle(16 + toothIdx, 'plaque', globalSiteIdx);
                              if (label === 'BOP') handleToggle(16 + toothIdx, 'bop', globalSiteIdx);
                            }}
                          >
                            {label === 'Mobility' ? tooth.mobility : ''}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PeriodontalChart; 