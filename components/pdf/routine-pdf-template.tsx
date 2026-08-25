import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Componente de @react-pdf/renderer (Document/Page/View/Text/Image "de esa
// librería", NO HTML) — corre exclusivamente en el servidor, ver
// app/(dashboard)/dashboard/alumnos/[id]/rutinas/[routineId]/pdf-actions.ts.
// Se reusa tal cual para rutinas y para plantillas: `memberName: null`
// dispara el label "Plantilla" y oculta esa línea de otro modo.

export type PdfExercise = {
  name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  rest_seconds: number | null;
  notes: string | null;
};

export type PdfDay = {
  name: string;
  exercises: PdfExercise[];
};

export type RoutinePdfProps = {
  gymName: string;
  gymLogoUrl: string | null;
  memberName: string | null;
  title: string;
  monthLabel: string | null;
  generatedAtLabel: string;
  days: PdfDay[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 56,
    paddingHorizontal: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#18181b",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    objectFit: "contain",
  },
  gymNameWithLogo: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  gymNameSolo: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d8",
    marginTop: 10,
    marginBottom: 14,
  },
  routineTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  memberName: {
    fontSize: 12,
    color: "#3f3f46",
    marginBottom: 3,
  },
  metaLine: {
    fontSize: 9,
    color: "#71717a",
  },
  dayTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  tableRow: {
    flexDirection: "row",
  },
  tableRowStripe: {
    backgroundColor: "#fafafa",
  },
  headerCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    padding: 6,
    backgroundColor: "#f4f4f5",
  },
  cell: {
    fontSize: 9,
    padding: 6,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#a1a1aa",
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    paddingTop: 6,
  },
});

type ColumnKey = "name" | "sets" | "reps" | "weight" | "rest" | "notes";

const ALL_COLUMNS: { key: ColumnKey; label: string; flex: number }[] = [
  { key: "name", label: "Ejercicio", flex: 3 },
  { key: "sets", label: "Series", flex: 1 },
  { key: "reps", label: "Reps", flex: 1 },
  { key: "weight", label: "Peso", flex: 1 },
  { key: "rest", label: "Descanso", flex: 1 },
  { key: "notes", label: "Notas", flex: 2 },
];

function cellValue(exercise: PdfExercise, key: ColumnKey): string {
  switch (key) {
    case "name":
      return exercise.name;
    case "sets":
      return exercise.sets !== null ? String(exercise.sets) : "—";
    case "reps":
      return exercise.reps || "—";
    case "weight":
      return exercise.weight !== null ? `${exercise.weight}kg` : "—";
    case "rest":
      return exercise.rest_seconds !== null ? `${exercise.rest_seconds}"` : "—";
    case "notes":
      return exercise.notes || "—";
  }
}

// "omitir columnas vacías si todos los ejercicios de esa rutina no tienen ese
// dato": se evalúa sobre TODA la rutina (todos los días), no día por día, así
// las tablas de cada día quedan con las mismas columnas entre sí.
function hasAnyValue(days: PdfDay[], key: ColumnKey): boolean {
  return days.some((day) => day.exercises.some((exercise) => cellValue(exercise, key) !== "—"));
}

export function RoutinePdfDocument({
  gymName,
  gymLogoUrl,
  memberName,
  title,
  monthLabel,
  generatedAtLabel,
  days,
}: RoutinePdfProps) {
  const columns = ALL_COLUMNS.filter((col) => col.key === "name" || hasAnyValue(days, col.key));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {gymLogoUrl ? (
          <View style={styles.headerRow}>
            {/* Es el <Image> de @react-pdf/renderer (no HTML): no acepta `alt`. */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={gymLogoUrl} style={styles.logo} />
            <Text style={styles.gymNameWithLogo}>{gymName}</Text>
          </View>
        ) : (
          <Text style={styles.gymNameSolo}>{gymName}</Text>
        )}

        <View style={styles.divider} />

        <Text style={styles.routineTitle}>{title}</Text>
        <Text style={styles.memberName}>{memberName ?? "Plantilla"}</Text>
        <Text style={styles.metaLine}>
          {[monthLabel, `Generado el ${generatedAtLabel}`].filter(Boolean).join(" · ")}
        </Text>

        {days.map((day, dayIndex) => (
          <View key={dayIndex}>
            <Text style={styles.dayTitle} minPresenceAhead={60}>
              {day.name}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableRow} wrap={false}>
                {columns.map((col) => (
                  <Text key={col.key} style={[styles.headerCell, { flex: col.flex }]}>
                    {col.label}
                  </Text>
                ))}
              </View>
              {day.exercises.map((exercise, exIndex) => (
                <View
                  key={exIndex}
                  style={[styles.tableRow, ...(exIndex % 2 === 1 ? [styles.tableRowStripe] : [])]}
                  wrap={false}
                >
                  {columns.map((col) => (
                    <Text key={col.key} style={[styles.cell, { flex: col.flex }]}>
                      {cellValue(exercise, col.key)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>{gymName}</Text>
          <Text>Generado con Constano</Text>
        </View>
      </Page>
    </Document>
  );
}
