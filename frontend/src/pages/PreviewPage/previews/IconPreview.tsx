import { Icon } from "@/components/Icon/Icon";
import { ICONS } from "@/components/Icon/icons";
import type { IconName } from "@/components/Icon/icons";

const NAMES = Object.keys(ICONS) as IconName[];

export function IconPreview() {
  return (
    <>
      <section className="preview-section">
        <h2>Set completo · 20px</h2>
        <div className="preview-grid">
          {NAMES.map(name => (
            <div key={name} className="preview-tile">
              <Icon name={name} size={20} />
              <code>{name}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="preview-section">
        <h2>Tamaños</h2>
        <div className="preview-row">
          <Icon name="route" size={16} />
          <Icon name="route" size={20} />
          <Icon name="route" size={24} />
          <Icon name="route" size={32} />
        </div>
      </section>

      <section className="preview-section">
        <h2>Con color heredado</h2>
        <div className="preview-row">
          <span style={{ color: "var(--route)" }}><Icon name="star" size={20} label="Destacado" /></span>
          <span style={{ color: "var(--ok)" }}><Icon name="check-circle" size={20} label="Aprobado" /></span>
          <span style={{ color: "var(--bad)" }}><Icon name="alert" size={20} label="Error" /></span>
        </div>
      </section>
    </>
  );
}
