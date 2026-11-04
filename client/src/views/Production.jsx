import { useLoad, R } from '../api.js';
import { Section, Loading, Tag, Tilt, ITEM_COLORS } from '../ui.jsx';

const EMOJI = { 'Kaju Katli': '◆', 'Mysore Pak': '▣', 'Besan Ladoo': '●', 'Soan Papdi': '▤', 'Motichoor Ladoo': '✺' };

export default function Production() {
  const recipes = useLoad('/recipes');
  const batches = useLoad('/batches');
  if (!recipes.data || !batches.data) return <Loading error={recipes.error || batches.error} />;
  const { tolerance } = batches.data;

  return (
    <>
      <Section kicker="04 · The kitchen" title="Recipes & production" />
      <div className="recipe-grid">
        {recipes.data.map((r, i) => {
          const total = Object.values(r.perKg).reduce((s, q) => s + q, 0);
          return (
            <Tilt key={r.name} className="recipe" style={{ '--i': i }}>
              <div className="recipe-glyph">{EMOJI[r.name]}</div>
              <h3>{r.name}</h3>
              <Tag tone="info">{r.version} approved</Tag>
              <div className="stack" aria-label="Ingredients per kg">
                {Object.entries(r.perKg).map(([item, q]) => (
                  <i key={item} style={{ flex: q / total, background: ITEM_COLORS[item] }} title={`${item} ${q.toFixed(3)} kg`} />
                ))}
              </div>
              <ul className="bom">
                {Object.entries(r.perKg).map(([item, q]) => <li key={item}><i className="dot" style={{ background: ITEM_COLORS[item] }} />{item}<b>{q.toFixed(3)} kg</b></li>)}
              </ul>
              <div className="big"><span>{R(r.costPerKg)}</span></div>
              <div className="lbl">standard ingredient cost per kg</div>
            </Tilt>
          );
        })}
      </div>

      <div className="card">
        <div className="card-head"><h3>Batch records · standard vs actual</h3><span className="lbl">Beyond ±{tolerance}% opens an exception. Finished batch release is Quality only.</span></div>
        <div className="wrap">
          <table className="tbl">
            <thead><tr><th>Batch</th><th>Recipe</th><th>Input</th><th>Expected</th><th>Output</th><th>Rejects</th><th className="w-var">Yield variance</th><th>Cost / kg</th></tr></thead>
            <tbody>
              {batches.data.batches.map((b) => {
                const w = Math.min(50, Math.abs(b.variance) * 4);
                return (
                  <tr key={b.id} className={b.flagged ? 'flag' : ''}>
                    <td className="mono">{b.id}</td><td>{b.recipeName} <span className="lbl">{b.version}</span></td>
                    <td>{b.input} kg</td><td>{b.expected} kg</td><td><b>{b.output} kg</b></td><td>{b.rejects} kg</td>
                    <td>
                      <div className="diverge">
                        <span className="mid" />
                        <i className={b.variance < 0 ? 'neg' : 'pos'} style={b.variance < 0 ? { right: '50%', width: `${w}%` } : { left: '50%', width: `${w}%` }} />
                      </div>
                      <span className={b.flagged ? 'dn small' : 'up small'}>{b.variance > 0 ? '+' : ''}{b.variance}%</span>
                    </td>
                    <td>{R(b.costPerKg)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
