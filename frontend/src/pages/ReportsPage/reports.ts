export const REPORTS = [
  {
    key: "rc1",
    tab: "Itinerarios generados",
    title: "Itinerarios generados",
    subtitle: "Generados automáticamente para un paquete, con su creador, fecha y parámetros.",
  },
  {
    key: "rc2",
    tab: "Más utilizadas",
    title: "Actividades más utilizadas",
    subtitle: "En los itinerarios finales de un paquete, por nivel de esfuerzo y categoría.",
  },
  {
    key: "rc3",
    tab: "Validaciones",
    title: "Validaciones por revisor",
    subtitle: "Itinerarios que validó un revisor, con la fecha y sus observaciones.",
  },
  {
    key: "rc4",
    tab: "Experiencia",
    title: "Experiencia en un itinerario",
    subtitle: "Satisfacción y abandono de los turistas, con las actividades clasificadas por esfuerzo.",
  },
  {
    key: "rc5",
    tab: "Comparar paquetes",
    title: "Comparar paquetes",
    subtitle: "Distribución de actividades por tipo, categoría y esfuerzo, y si se cumplieron los criterios de equilibrio.",
  },
  {
    key: "rc6",
    tab: "Esfuerzo y valoración",
    title: "Esfuerzo y valoración",
    subtitle: "Correlación por paquete, actividades con más abandono y turistas que pidieron modificación.",
  },
] as const;

export type ReportKey = (typeof REPORTS)[number]["key"];

export const TABS = REPORTS.map(report => ({ key: report.key, label: report.tab }));

export function findReport(rc: string | undefined) {
  return REPORTS.find(report => report.key === rc);
}
