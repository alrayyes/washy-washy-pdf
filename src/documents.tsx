import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  type Blocker,
  blockerCode,
  blockerLegend,
  canMix,
  cardGroups,
  durationsOf,
  formatTemperature,
  ironGroups,
  ironSetting,
  ironSettingKeys,
  loadGroups,
  type Machine,
  mixBlocker,
  type ResolvedInstruction,
  type Variant,
  washGroups,
} from "@washy-washy/core/browser";
import { ApplianceContext, useMachine } from "./appliances";
import {
  ControlPanel,
  Field,
  IronDial,
  IronPanel,
  ProgramDial,
  SoftenerBadge,
  SplitField,
} from "./components";
import { theme } from "./theme";

const { colour, font, type, space } = theme;

const A4 = { width: 595.28, height: 841.89 };
/** Both reference-sheet pages use this margin on every side. */
const PAGE_MARGIN = 36;
/**
 * How wide a hand-laid-out row on the reference sheet is allowed to be —
 * the printable width once the page margin comes off both sides. Every
 * variant's `summaryColumns` widths plus the row-number gutter have to sum
 * to at most this, checked by `test/documents.test.ts`.
 */
export const TABLE_WIDTH_BUDGET = A4.width - PAGE_MARGIN * 2;
/**
 * Printed Helvetica under this is not readable. `density` scales the
 * reference sheet's type down as a chart grows, but fitting the page must
 * never win by making the type unreadable — every size that scales with
 * density goes through `densityFont`, which floors here instead of
 * continuing to shrink. What tightening a dense chart still needs comes out
 * of the grid instead: `summaryColumns` widths and `labelWidth` scale with
 * `density` too, so there's still a lever left once the type bottoms out.
 */
export const MIN_FONT_SIZE = 6;
/** A text size that shrinks with `density`, but never past `MIN_FONT_SIZE`. */
export function densityFont(base: number, density: number): number {
  return Math.max(base * density, MIN_FONT_SIZE);
}
/**
 * The phone sheet's fixed page width, in points — 244pt is roughly the
 * width of a phone screen at a comfortable reading zoom.
 *
 * @example
 * ```ts
 * import { PHONE_WIDTH } from "@washy-washy/pdf";
 *
 * console.log(PHONE_WIDTH); // 244
 * ```
 */
const PHONE_WIDTH = 244;

function ironLabel(machine: Machine, item: ResolvedInstruction): string {
  if (!item.ironing) return "do not iron";
  return ironSetting(machine, item.ironSetting)?.label ?? item.ironSetting;
}

/**
 * What makes an ironing card unique. A pile you never iron has no thermostat
 * position, so every no-iron group would otherwise share the empty key.
 */
function ironCardKey(item: ResolvedInstruction): string {
  return item.ironing ? item.ironSetting : "do-not-iron";
}

/**
 * How a sheet divides the chart into cards, which is not the same question on
 * each. See `cardGroups`, `washGroups` and `ironGroups` for why.
 */
function sheetGroups(
  items: ResolvedInstruction[],
  machine: Machine,
  variant: Variant,
): ResolvedInstruction[][] {
  if (variant === "wash") return washGroups(items);
  if (variant === "iron") return ironGroups(items, ironSettingKeys(machine));
  return cardGroups(items);
}

const sheet: Record<Variant, { title: string; phone: string; print: string; card: string }> = {
  full: {
    title: "Washing instructions",
    phone: "Scroll for the pile you are holding.",
    print: "Pin this next to the machine.",
    card: "One pile, on its own.",
  },
  wash: {
    title: "Washing instructions (washing only)",
    phone: "Getting it into the machine. Ironing is on the other sheet.",
    print: "Pin this next to the machine. Ironing is on the other sheet.",
    card: "One pile, on its own. Ironing is on the other sheet.",
  },
  iron: {
    title: "Washing instructions (ironing only)",
    phone: "At the board. Washing is on the other sheet.",
    print: "Pin this next to the board. Washing is on the other sheet.",
    card: "One pile, on its own. Washing is on the other sheet.",
  },
};

/**
 * PDF metadata every document here shares — `title` stays whatever each
 * `<Document>` already sets, since it's the one field that differs (phone,
 * reference, print).
 */
function documentMeta(machine: Machine, variant: Variant) {
  return {
    author: "washy-washy",
    subject: `${machine.washer.name} — ${sheet[variant].title}`,
    creator: "@washy-washy/pdf",
    language: "en-GB",
  };
}

/**
 * Names the sheet and machine on every page after the first, so a page
 * pinned up on its own — or found loose, out of order — still says what it
 * is. The first page keeps `Masthead` instead; `pageNumber` is the running
 * count across the whole document, not just this `<Page>`, so a single
 * check here is enough regardless of which physical page happens to be
 * first.
 */
function RunningHeader({ machine, variant }: { machine: Machine; variant: Variant }) {
  return (
    <Text
      fixed
      render={({ pageNumber }) =>
        pageNumber === 1 ? "" : `${sheet[variant].title} · ${machine.washer.name}`
      }
      style={{
        position: "absolute",
        top: 14,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
        fontFamily: font.sans,
        fontSize: type.base,
        color: colour.muted,
      }}
    />
  );
}

/** Omitted on a single-page render — "1 of 1" on its own sheet is noise. */
function PageFooter() {
  return (
    <Text
      fixed
      render={({ pageNumber, totalPages }) =>
        totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ""
      }
      style={{
        position: "absolute",
        bottom: 14,
        left: PAGE_MARGIN,
        right: PAGE_MARGIN,
        textAlign: "right",
        fontFamily: font.sans,
        fontSize: type.footnote,
        color: colour.faint,
      }}
    />
  );
}

function SectionHeading({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: font.bold,
        fontSize: type.label,
        letterSpacing: 0.8,
        color: colour.muted,
        marginBottom: space.sm,
      }}
    >
      {children.toUpperCase()}
    </Text>
  );
}

/**
 * One card, top to bottom: what it is, how the machine goes, iron, dry.
 *
 * `group` is usually a single pile. Where several piles are set up identically
 * on both appliances they share one card, and any prose they disagree on is
 * listed per pile rather than one pile's advice standing in for the rest.
 *
 * On a washing-only sheet the iron block comes off and the group is wider,
 * because the thermostat is the only thing those piles disagreed about.
 */
function Card({
  group,
  index,
  compact = false,
  variant = "full",
}: {
  group: ResolvedInstruction[];
  index: number;
  compact?: boolean;
  variant?: Variant;
}) {
  const item = group[0] as ResolvedInstruction;
  const heading = group.map((member) => member.clothingType).join(" + ");
  const names = new Set(group.map((member) => member.clothingType));
  // Identical settings do not guarantee they may share a drum — the colour and
  // lint rules are separate — so ask rather than assume.
  const together = group.every((a) => group.every((b) => a === b || canMix(a, b)));
  // Only piles that suit every member of the card, not just the first one.
  const alsoWith = item.mixesWith.filter(
    (name) => !names.has(name) && group.every((member) => member.mixesWith.includes(name)),
  );

  return (
    <View
      style={{
        borderWidth: space.edgeWidth,
        borderColor: colour.line,
        borderRadius: space.md,
        padding: compact ? space.lg : space.xl,
        marginBottom: compact ? space.lg : space.xxl,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: space.edgeWidth,
          borderBottomColor: colour.ink,
          paddingBottom: 3,
          marginBottom: 5,
        }}
      >
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: compact ? type.heading : type.headingLarge,
            color: colour.ink,
            flex: 1,
            paddingRight: 6,
          }}
        >
          {index}. {heading}
        </Text>
        <Text style={{ fontFamily: font.bold, fontSize: type.subtitle, color: colour.accent }}>
          {durationsOf(group)}
        </Text>
      </View>

      <View
        style={{ flexDirection: "row", alignItems: "center", gap: space.base, marginBottom: 5 }}
      >
        <SoftenerBadge on={item.fabricSoftener} />
        <Text style={{ fontFamily: font.bold, fontSize: type.strong, color: colour.ink }}>
          {item.program}{" "}
          {/^\d+$/.test(item.temperature) ? `${item.temperature} °C` : item.temperature} ·{" "}
          {item.spin === "0" ? "no spin" : `${item.spin} rpm`}
        </Text>
      </View>

      <ControlPanel item={item} dialSize={compact ? 68 : 78} />

      <SplitField label="Detergent" items={group} pick={(member) => member.detergent} />

      {variant !== "wash" && (
        <View style={{ marginTop: 5 }}>
          <SectionHeading>Iron</SectionHeading>
          <IronPanel items={group} dialSize={compact ? 54 : 62} />
        </View>
      )}

      <SplitField label="Drying" items={group} pick={(member) => member.drying} />
      <Field
        label="Wash together with"
        value={
          group.length > 1 && together
            ? `each other${alsoWith.length > 0 ? `, and ${alsoWith.join(", ")}` : ""}`
            : group.length > 1
              ? "same settings, but wash these separately — see the matrix"
              : alsoWith.length > 0
                ? alsoWith.join(", ")
                : "nothing else — wash alone"
        }
        emphasis
      />
      <SplitField label="Notes" items={group} pick={(member) => member.notes} />
    </View>
  );
}

/**
 * One thermostat position and everything that goes at it.
 *
 * The heading is the setting rather than the pile, because that is the order
 * you work in: set the iron once, then go through the basket. The last card is
 * always the one nothing on it ever gets ironed, which is worth printing — "is
 * this safe to press" is the question that ruins a shirt.
 */
function IronCard({
  group,
  index,
  compact = false,
}: {
  group: ResolvedInstruction[];
  index: number;
  compact?: boolean;
}) {
  const machine = useMachine();
  const item = group[0] as ResolvedInstruction;
  const setting = item.ironing ? ironSetting(machine, item.ironSetting) : undefined;

  return (
    <View
      style={{
        borderWidth: space.edgeWidth,
        borderColor: colour.line,
        borderRadius: space.md,
        padding: compact ? space.lg : space.xl,
        marginBottom: compact ? space.lg : space.xxl,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: space.edgeWidth,
          borderBottomColor: colour.ink,
          paddingBottom: 3,
          marginBottom: 5,
        }}
      >
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: compact ? type.heading : type.headingLarge,
            color: colour.ink,
            flex: 1,
            paddingRight: 6,
          }}
        >
          {index}. {setting ? `${setting.label} — ${setting.detail}` : "Do not iron"}
        </Text>
        <Text style={{ fontFamily: font.sans, fontSize: type.base, color: colour.muted }}>
          {group.length} {group.length === 1 ? "pile" : "piles"}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colour.panel,
          borderWidth: space.ruleWidth,
          borderColor: colour.hairline,
          borderRadius: space.sm,
          padding: space.base2,
          gap: space.lg,
        }}
      >
        <IronDial setting={item.ironSetting} off={!item.ironing} size={compact ? 54 : 62} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.bold, fontSize: type.emphasis, color: colour.ink }}>
            {setting ? `Thermostat on ${setting.label}` : "Leave the iron off"}
          </Text>
          <Text style={{ fontFamily: font.sans, fontSize: type.muted, color: colour.muted }}>
            {setting
              ? setting.steam
                ? "inside the steam zone"
                : "below the steam zone — dry iron only"
              : "nothing on this card ever goes near the board"}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 4 }}>
        <SectionHeading>{setting ? "How" : "Never these"}</SectionHeading>
        {group.map((member) => {
          // On the no-iron card the heading has said it already, so only a
          // reason earns the second column. Elsewhere the line is the point.
          const note = member.ironingNotes;
          return (
            <View
              key={member.clothingType}
              style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 1.5 }}
            >
              <Text
                style={{
                  fontFamily: font.bold,
                  fontSize: type.note,
                  lineHeight: 1.35,
                  color: colour.ink,
                  width: compact ? 84 : 122,
                  paddingRight: 4,
                }}
              >
                {member.clothingType}
              </Text>
              <Text
                style={{
                  fontFamily: font.sans,
                  fontSize: type.note,
                  lineHeight: 1.35,
                  color: colour.body,
                  flex: 1,
                }}
              >
                {note}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Masthead({ subtitle }: { subtitle: string }) {
  const { washer, iron } = useMachine();

  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontFamily: font.bold, fontSize: type.title, color: colour.ink }}>
        Washing instructions
      </Text>
      <Text
        style={{
          fontFamily: font.sans,
          fontSize: type.subtitle,
          color: colour.muted,
          marginTop: 1.5,
        }}
      >
        {subtitle}
      </Text>
      <Text style={{ fontFamily: font.sans, fontSize: type.subtitle, color: colour.muted }}>
        {washer.name}, {washer.capacity} · {iron.name}
      </Text>
    </View>
  );
}

/**
 * The piles collapsed into actual loads: everything on one line goes in the
 * drum at the same time on the same settings. This is the answer to "can I
 * put these two in together" without reading the matrix.
 */
function Loads({ items }: { items: ResolvedInstruction[] }) {
  const groups = loadGroups(items);

  return (
    <View style={{ marginBottom: 10 }}>
      <SectionHeading>Loads — one line, one wash</SectionHeading>
      <Text
        style={{
          fontFamily: font.sans,
          fontSize: type.micro,
          color: colour.muted,
          marginBottom: space.xs,
        }}
      >
        Bold pile names share one wash.
      </Text>
      <View
        style={{
          borderWidth: space.ruleWidth,
          borderColor: colour.hairline,
          borderRadius: space.sm,
          paddingVertical: space.xs,
          paddingHorizontal: space.base2,
        }}
      >
        {groups.map((group) => {
          const first = group[0] as ResolvedInstruction;
          return (
            <View
              key={first.clothingType}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                paddingVertical: 2.6,
                borderBottomWidth: group === groups[groups.length - 1] ? 0 : 0.4,
                borderBottomColor: colour.hairline,
              }}
            >
              <Text
                style={{
                  fontFamily: font.bold,
                  fontSize: type.muted,
                  color: colour.accent,
                  // Wide enough for a longer real programme name ("Allergy
                  // Plus Extra") to wrap onto two lines rather than crowd
                  // the pile names beside it.
                  width: 78,
                }}
              >
                {first.program} {formatTemperature(first.temperature)}
              </Text>
              <Text
                style={{
                  fontFamily: group.length > 1 ? font.bold : font.sans,
                  fontSize: type.prose,
                  color: group.length > 1 ? colour.ink : colour.body,
                  flex: 1,
                }}
              >
                {group.map((item) => item.clothingType).join("  +  ")}
                {group.length === 1 ? "   (on its own)" : ""}
              </Text>
              {/* How long the drum is busy, which is the other half of planning a day. */}
              <Text
                style={{
                  fontFamily: font.sans,
                  fontSize: type.muted,
                  color: colour.muted,
                  width: 42,
                  textAlign: "right",
                }}
              >
                {durationsOf(group)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * The dial-explanation box's fixed size. Stated rather than inferred (an Svg
 * contributes nothing to the layout, so without it the grey panel shrinks to
 * the caption and the dial spills out of the top) and shared with the dial
 * drawn inside it, so the two can't drift apart.
 */
const LEGEND_DIAL_SIZE = 54;
const LEGEND_BOX_HEIGHT = 66;

/** How to read the dial drawings, printed once per document. */
function Legend({ last = false, variant = "full" }: { last?: boolean; variant?: Variant }) {
  const machine = useMachine();
  const { washer } = machine;
  const off = washer.programs[0] ?? "";
  const example = washer.programs[1] ?? off;
  // The hottest position the iron offers, so the drawing shows a full ring.
  const hottest = machine.iron.settings[machine.iron.settings.length - 1]?.key ?? "";

  return (
    <View
      wrap={false}
      style={{
        flexDirection: "row",
        gap: space.xl,
        backgroundColor: colour.panel,
        borderRadius: space.sm,
        padding: space.lg,
        marginBottom: last ? 0 : space.xl,
      }}
    >
      <View style={{ width: LEGEND_DIAL_SIZE, height: LEGEND_BOX_HEIGHT, alignItems: "center" }}>
        {variant === "iron" ? (
          <IronDial setting={hottest} size={LEGEND_DIAL_SIZE} />
        ) : (
          <ProgramDial program={example} size={LEGEND_DIAL_SIZE} />
        )}
        <Text
          style={{
            fontFamily: font.sans,
            fontSize: type.micro,
            color: colour.muted,
            marginTop: 2,
          }}
        >
          {variant === "iron" ? "thermostat" : "programme"}
        </Text>
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text
          style={{
            fontFamily: font.sans,
            fontSize: type.base,
            color: colour.body,
            lineHeight: 1.4,
            paddingRight: 2,
          }}
        >
          {variant === "iron" ? (
            <>
              The ring is the iron's thermostat as it sits on the dial, and the red pointer is where
              to turn it. The blue band is the zone where it makes steam; a setting below it is a
              dry iron. A crossed-out ring means leave the iron in the cupboard.
            </>
          ) : (
            <>
              The dials are drawn as they sit on the machine: twelve o'clock is {off}, and the red
              pointer is where to turn it. Chips show every value the display steps through, filled
              in on the one you want.
              {variant === "full" &&
                " On the iron, the blue band is the zone where it makes steam."}
            </>
          )}
        </Text>
      </View>
    </View>
  );
}

/** The machine's own numbers, not a promise — shown wherever a duration is. */
function DurationDisclaimer() {
  return (
    <Text
      style={{
        fontFamily: font.oblique,
        fontSize: type.label,
        color: colour.faint,
        marginTop: 4,
        textAlign: "center",
      }}
    >
      Durations are the machine's own estimates and vary with load.
    </Text>
  );
}

/**
 * The phone version: one narrow page you scroll from top to bottom.
 *
 * @example
 * ```tsx
 * import { pdf } from "@react-pdf/renderer";
 * import { PhoneDocument } from "@washy-washy/pdf";
 *
 * const blob = await pdf(
 *   PhoneDocument({ items, height: 1600, machine }),
 * ).toBlob();
 * ```
 */
export function PhoneDocument({
  items,
  height,
  machine,
  variant = "full",
}: {
  items: ResolvedInstruction[];
  height: number;
  machine: Machine;
  variant?: Variant;
}) {
  const groups = sheetGroups(items, machine, variant);

  return (
    <ApplianceContext.Provider value={machine}>
      <Document title={`${sheet[variant].title} — phone`} {...documentMeta(machine, variant)}>
        <Page
          size={{ width: PHONE_WIDTH, height }}
          style={{ padding: space.xxl, backgroundColor: colour.paper }}
        >
          <Masthead subtitle={sheet[variant].phone} />
          {variant !== "iron" && <Loads items={items} />}
          <Legend variant={variant} />
          {groups.map((group, index) =>
            variant === "iron" ? (
              <IronCard
                key={ironCardKey(group[0] as ResolvedInstruction)}
                group={group}
                index={index + 1}
                compact
              />
            ) : (
              <Card
                key={(group[0] as ResolvedInstruction).clothingType}
                group={group}
                index={index + 1}
                variant={variant}
                compact
              />
            ),
          )}
          {variant !== "iron" && <DurationDisclaimer />}
        </Page>
      </Document>
    </ApplianceContext.Provider>
  );
}

/**
 * One pile's card, on its own sheet — the machine name line and (unless
 * ironing is the whole point) the duration disclaimer around it, nothing
 * else. No loads table, no legend: those answer questions about the whole
 * chart, and this is one pile downloaded on its own.
 *
 * `items` is one resolved group, same as `Card`/`IronCard` take — usually a
 * single pile, occasionally several sharing identical settings.
 *
 * @example
 * ```tsx
 * import { pdf } from "@react-pdf/renderer";
 * import { CardDocument } from "@washy-washy/pdf";
 *
 * const blob = await pdf(
 *   CardDocument({ items: group, height: 500, machine }),
 * ).toBlob();
 * ```
 */
export function CardDocument({
  items,
  height,
  machine,
  variant = "full",
}: {
  items: ResolvedInstruction[];
  height: number;
  machine: Machine;
  variant?: Variant;
}) {
  return (
    <ApplianceContext.Provider value={machine}>
      <Document title={`${sheet[variant].title} — card`} {...documentMeta(machine, variant)}>
        <Page
          size={{ width: PHONE_WIDTH, height }}
          style={{ padding: space.xxl, backgroundColor: colour.paper }}
        >
          <Masthead subtitle={sheet[variant].card} />
          {variant === "iron" ? (
            <IronCard group={items} index={1} compact />
          ) : (
            <Card group={items} index={1} variant={variant} compact />
          )}
          {variant !== "iron" && <DurationDisclaimer />}
        </Page>
      </Document>
    </ApplianceContext.Provider>
  );
}

export interface Column {
  label: string;
  width: number;
  value: (item: ResolvedInstruction) => string;
}

/** The first clause of a sentence, which is all a table cell has room for. */
function gist(prose: string): string {
  return prose.split(/[—.:]/)[0]?.trim() ?? "";
}

/**
 * What the pinned sheet lists per pile, which differs by sheet.
 *
 * The columns are laid out by hand rather than flexed, so their widths plus
 * the 14pt row-number gutter have to come to at most `TABLE_WIDTH_BUDGET` —
 * checked by `test/documents.test.ts`, not just this comment.
 */
export function summaryColumns(machine: Machine, variant: Variant): Column[] {
  if (variant === "iron") {
    return [
      { label: "Pile", width: 130, value: (i) => i.clothingType },
      { label: "Thermostat", width: 46, value: (i) => ironLabel(machine, i) },
      {
        label: "Steam",
        width: 34,
        value: (i) => (i.ironing && ironSetting(machine, i.ironSetting)?.steam ? "yes" : "—"),
      },
      {
        label: "Why not / how",
        width: 295,
        // Same rule as the card: the Thermostat column beside this one already
        // reads "do not iron", so a cell repeating it is a cell of noise.
        value: (i) => gist(i.ironingNotes),
      },
    ];
  }

  return [
    { label: "Pile", width: 110, value: (i) => i.clothingType },
    { label: "Programme", width: 70, value: (i) => i.program },
    { label: "°C", width: 26, value: (i) => i.temperature },
    { label: "Spin", width: 30, value: (i) => i.spin },
    { label: "Time", width: 34, value: (i) => i.duration },
    { label: "Buttons", width: 72, value: (i) => i.options.join(", ") || "—" },
    { label: "Softener", width: 40, value: (i) => (i.fabricSoftener ? "yes" : "no") },
    ...(variant === "full"
      ? [{ label: "Iron", width: 40, value: (i: ResolvedInstruction) => ironLabel(machine, i) }]
      : []),
    { label: "Detergent", width: variant === "full" ? 87 : 127, value: (i) => gist(i.detergent) },
  ];
}

function SummaryTable({
  items,
  density,
  variant,
}: {
  items: ResolvedInstruction[];
  density: number;
  variant: Variant;
}) {
  const machine = useMachine();
  const columns = summaryColumns(machine, variant);

  return (
    <View style={{ marginBottom: space.xxxl }}>
      <SectionHeading>{variant === "iron" ? "On the board" : "At a glance"}</SectionHeading>
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: space.edgeWidth,
          borderBottomColor: colour.ink,
          paddingBottom: 2.5,
        }}
      >
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: densityFont(type.footnote, density),
            width: 14 * density,
            color: colour.ink,
          }}
        >
          #
        </Text>
        {columns.map((column) => (
          <Text
            key={column.label}
            style={{
              fontFamily: font.bold,
              fontSize: densityFont(type.footnote, density),
              width: column.width * density,
              color: colour.ink,
            }}
          >
            {column.label}
          </Text>
        ))}
      </View>
      {items.map((item, index) => (
        <View
          key={item.clothingType}
          style={{
            flexDirection: "row",
            paddingVertical: 2.6 * density,
            borderBottomWidth: space.hairlineWidth,
            borderBottomColor: colour.hairline,
            backgroundColor: index % 2 === 1 ? colour.panel : colour.paper,
          }}
        >
          <Text
            style={{
              fontFamily: font.sans,
              fontSize: densityFont(type.cell, density),
              width: 14 * density,
              color: colour.muted,
            }}
          >
            {index + 1}
          </Text>
          {columns.map((column, position) => (
            <Text
              key={column.label}
              style={{
                fontFamily: position === 0 ? font.bold : font.sans,
                fontSize: densityFont(type.cell, density),
                width: column.width * density,
                color: position === 0 ? colour.ink : colour.body,
                paddingRight: 4,
              }}
            >
              {column.value(item)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * The answer to "can these two go in together" for every pair, as a grid.
 * Columns are numbered to match the rows so the header stays narrow.
 */
/** A bold "OK" — the widest thing a cell ever holds — still reads at this width. */
export const MIN_MATRIX_CELL = 14;

function MixMatrix({ items, density }: { items: ResolvedInstruction[]; density: number }) {
  // Narrows with density like the summary table's columns, so a dense chart
  // spends its tightening on the grid too, not on type alone — it also frees
  // more of the row width for `cell`, the actual matrix squares.
  const labelWidth = 118 * density;
  const available = A4.width - 72 - labelWidth;
  // However many columns fit at MIN_MATRIX_CELL — past this the matrix
  // splits into blocks stacked one under the other rather than letting
  // cells keep narrowing past legibility. Full-width columns still divide
  // available space evenly when there are few enough of them to fit.
  const columnsPerBlock = Math.max(1, Math.floor(available / MIN_MATRIX_CELL));
  const cell = available / Math.min(items.length, columnsPerBlock);
  const used = new Set<Blocker>();
  for (const a of items)
    for (const b of items) {
      const blocker = a === b ? null : mixBlocker(a, b);
      if (blocker) used.add(blocker);
    }

  const blocks: { column: ResolvedInstruction; columnIndex: number }[][] = [];
  for (let start = 0; start < items.length; start += columnsPerBlock) {
    blocks.push(
      items
        .slice(start, start + columnsPerBlock)
        .map((column, offset) => ({ column, columnIndex: start + offset })),
    );
  }

  return (
    <View>
      <SectionHeading>Can these share a load?</SectionHeading>
      {blocks.map((block, blockIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: blocks are a fixed split of a stable item list, not reordered or filtered
        <View key={blockIndex} style={{ marginTop: blockIndex === 0 ? 0 : 6 }}>
          <View style={{ flexDirection: "row" }}>
            <View style={{ width: labelWidth }} />
            {block.map(({ column, columnIndex }) => (
              <Text
                key={column.clothingType}
                style={{
                  fontFamily: font.bold,
                  fontSize: densityFont(type.label, density),
                  width: cell,
                  textAlign: "center",
                  color: colour.muted,
                }}
              >
                {columnIndex + 1}
              </Text>
            ))}
          </View>
          {items.map((row, rowIndex) => (
            <View key={row.clothingType} style={{ flexDirection: "row", alignItems: "stretch" }}>
              <Text
                style={{
                  fontFamily: font.sans,
                  fontSize: densityFont(type.muted, density),
                  width: labelWidth,
                  color: colour.ink,
                  paddingVertical: 2.2 * density,
                  paddingRight: 4,
                }}
              >
                {rowIndex + 1}. {row.clothingType}
              </Text>
              {block.map(({ column, columnIndex }) => {
                const self = rowIndex === columnIndex;
                const blocker = self ? null : mixBlocker(row, column);
                const background = self ? colour.line : blocker ? colour.paper : colour.yesSoft;
                return (
                  <View
                    key={column.clothingType}
                    style={{
                      width: cell,
                      backgroundColor: background,
                      borderWidth: space.hairlineWidth,
                      borderColor: colour.hairline,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 2.2 * density,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: blocker ? font.bold : font.sans,
                        fontSize: densityFont(type.label, density),
                        // Inverted from how this used to read: a blocker is
                        // the thing that ruins a garment, so it gets the
                        // loud ink. "OK" already has the soft green fill
                        // saying "safe" — it doesn't need bold, full-strength
                        // text as well.
                        color: blocker ? colour.no : colour.muted,
                      }}
                    >
                      {self ? "" : blocker ? blockerCode[blocker] : "OK"}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xl, marginTop: 5 }}>
        <Text style={{ fontFamily: font.sans, fontSize: type.small, color: colour.body }}>
          OK — same drum
        </Text>
        {[...used].map((blocker) => (
          <Text
            key={blocker}
            style={{ fontFamily: font.sans, fontSize: type.small, color: colour.body }}
          >
            <Text style={{ fontFamily: font.bold, color: colour.no }}>{blockerCode[blocker]}</Text>
            {" — "}
            {blockerLegend[blocker].toLowerCase()}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * The one sheet you pin up: every pile at a glance, and what may share a drum.
 *
 * `density` scales the two tables, whose height is the only part of the sheet
 * that grows with the chart. It is not chosen here — `renderPrint` finds the
 * loosest setting this still fits an A4 at, because there is no way to ask the
 * layout engine how tall the content came out.
 */
function ReferenceSheet({
  items,
  density,
  variant,
}: {
  items: ResolvedInstruction[];
  density: number;
  variant: Variant;
}) {
  const machine = useMachine();
  // The ironing sheet reads coolest to hottest, the order you work the basket
  // in, rather than the order the chart happens to list the piles in.
  const rows = variant === "iron" ? ironGroups(items, ironSettingKeys(machine)).flat() : items;

  return (
    <Page
      size={[A4.width, A4.height]}
      style={{ padding: PAGE_MARGIN, backgroundColor: colour.paper }}
    >
      <RunningHeader machine={machine} variant={variant} />
      <Masthead subtitle={sheet[variant].print} />
      {variant !== "iron" && <Loads items={items} />}
      <SummaryTable items={rows} density={density} variant={variant} />
      {variant !== "iron" && <MixMatrix items={items} density={density} />}
      {/*
        No trailing margin. A margin below the last thing on a page is still
        height, and @react-pdf answers a page it cannot fit with an empty sheet
        rather than an error — which is how a blank page 2 appeared the first
        time a machine with longer programme names widened the table above.
      */}
      <View style={{ marginTop: 12 }}>
        <Legend last variant={variant} />
      </View>
      <PageFooter />
    </Page>
  );
}

/**
 * The reference sheet on its own, which is what the fitting pass measures.
 *
 * @example
 * ```tsx
 * import { pdf } from "@react-pdf/renderer";
 * import { ReferenceDocument } from "@washy-washy/pdf";
 *
 * const blob = await pdf(
 *   ReferenceDocument({ items, machine, density: 1 }),
 * ).toBlob();
 * ```
 */
export function ReferenceDocument({
  items,
  machine,
  density,
  variant = "full",
}: {
  items: ResolvedInstruction[];
  machine: Machine;
  density: number;
  variant?: Variant;
}) {
  return (
    <ApplianceContext.Provider value={machine}>
      <Document title={`${sheet[variant].title} — reference`} {...documentMeta(machine, variant)}>
        <ReferenceSheet items={items} density={density} variant={variant} />
      </Document>
    </ApplianceContext.Provider>
  );
}

/**
 * The printable version: a reference sheet, then two detail cards per page.
 *
 * @example
 * ```tsx
 * import { pdf } from "@react-pdf/renderer";
 * import { PrintDocument } from "@washy-washy/pdf";
 *
 * const blob = await pdf(
 *   PrintDocument({ items, machine, density: 1 }),
 * ).toBlob();
 * ```
 */
export function PrintDocument({
  items,
  machine,
  density,
  variant = "full",
}: {
  items: ResolvedInstruction[];
  machine: Machine;
  density: number;
  variant?: Variant;
}) {
  const groups = sheetGroups(items, machine, variant);

  return (
    <ApplianceContext.Provider value={machine}>
      <Document title={`${sheet[variant].title} — print`} {...documentMeta(machine, variant)}>
        <ReferenceSheet items={items} density={density} variant={variant} />
        {/*
        The cards flow onto as many A4 sheets as they need. How many land on
        a sheet depends on how much prose the CSV carries — an ordinary card
        moves to a fresh page as a whole rather than splitting, simply
        because it comfortably fits one; only a card long enough to exceed a
        full page's height ever actually splits.
      */}
        <Page
          size={[A4.width, A4.height]}
          style={{ padding: PAGE_MARGIN, backgroundColor: colour.paper }}
        >
          <RunningHeader machine={machine} variant={variant} />
          {groups.map((group, index) =>
            variant === "iron" ? (
              <IronCard
                key={ironCardKey(group[0] as ResolvedInstruction)}
                group={group}
                index={index + 1}
              />
            ) : (
              <Card
                key={(group[0] as ResolvedInstruction).clothingType}
                group={group}
                index={index + 1}
                variant={variant}
              />
            ),
          )}
          <PageFooter />
        </Page>
      </Document>
    </ApplianceContext.Provider>
  );
}

export { PHONE_WIDTH };
