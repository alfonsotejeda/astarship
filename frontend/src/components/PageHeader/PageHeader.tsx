import { Fragment } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";
import { Icon } from "@/components/Icon/Icon";
import "./PageHeader.css";

export type Breadcrumb = {
  label: string;
  to?: string;
};

type PageHeaderProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: string;
  subtitle?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  status?: ReactNode;
  actions?: ReactNode;
};

function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  return (
    <nav className="page-header__breadcrumbs" aria-label="Ruta">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={index}>
            {index > 0 && <Icon name="chevron-right" size={14} />}
            {item.to ? (
              <Link to={item.to} className="page-header__crumb-link">
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  status,
  actions,
  className,
  ...rest
}: PageHeaderProps) {
  const classes = ["page-header", className].filter(Boolean).join(" ");

  return (
    <header className={classes} {...rest}>
      {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}

      <div className="page-header__row">
        <div className="page-header__text">
          <div className="page-header__title-row">
            <h1 className="page-header__title">{title}</h1>
            {status}
          </div>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>

        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
