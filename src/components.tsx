import { Circle, G, Line, Path, Svg, Text, View } from "@react-pdf/renderer";
import { type Instruction, ironSetting } from "@washy-washy/core/browser";
import { useMachine } from "./appliances";
import { theme } from "./theme";

const { colour, font, type, space } = theme;

function polar(cx: number, cy: number, radius: number, degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

/** SVG arc path between two angles, measured clockwise from 12 o'clock. */
function arc(cx: number, cy: number, radius: number, from: number, to: number): string {
  const start = polar(cx, cy, radius, from);
  const end = polar(cx, cy, radius, to);
  const largeArc = to - from > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * The programme dial, drawn to scale: one tick per position on the real fascia,
 * in the real order, with the pointer on the one you want. The machine file's
 * first programme sits at twelve o'clock exactly as it does on the machine.
 */
export function ProgramDial({ program, size = 76 }: { program: string; size?: number }) {
  const { washer } = useMachine();
  const centre = size / 2;
  const outer = centre - 3;
  const knob = outer * 0.45;
  const index = Math.max(0, washer.programs.indexOf(program));
  const step = 360 / washer.programs.length;

  return (
    // An Svg carries no intrinsic height in the layout, so without the style
    // it overflows whatever box it is centred in.
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: size, height: size }}
    >
      {/* The red arc printed on the fascia, running clockwise from the off position. */}
      <Path
        d={arc(centre, centre, outer, step * 0.6, 360 - step * 0.6)}
        stroke={colour.accent}
        strokeWidth={0.8}
        fill="none"
      />
      <G>
        {washer.programs.map((name, position) => {
          const angle = position * step;
          const selected = position === index;
          const inner = polar(centre, centre, selected ? knob + 1 : outer - 4.5, angle);
          const edge = polar(centre, centre, selected ? outer + 1.5 : outer, angle);
          return (
            <Line
              key={name}
              x1={inner.x}
              y1={inner.y}
              x2={edge.x}
              y2={edge.y}
              stroke={selected ? colour.accent : colour.faint}
              strokeWidth={selected ? 2 : 0.7}
            />
          );
        })}
      </G>
      <Circle
        cx={centre}
        cy={centre}
        r={knob}
        fill={colour.knob}
        stroke={colour.line}
        strokeWidth={0.8}
      />
      <Line
        x1={centre}
        y1={centre}
        x2={polar(centre, centre, knob - 1.5, index * step).x}
        y2={polar(centre, centre, knob - 1.5, index * step).y}
        stroke={colour.accent}
        strokeWidth={2}
      />
      <Circle cx={centre} cy={centre} r={1.6} fill={colour.accent} />
    </Svg>
  );
}

/**
 * The iron's thermostat ring: MIN through MAX, with the shaded band marking
 * where the iron actually makes steam, and the pointer on the right setting.
 */
export function IronDial({
  setting,
  off = false,
  size = 76,
}: {
  setting: string;
  /** Draw the crossed-out ring instead of a pointer. */
  off?: boolean;
  size?: number;
}) {
  const machine = useMachine();
  const settings = machine.iron.settings;
  const centre = size / 2;
  const outer = centre - 3;
  const knob = outer * 0.42;
  const sweep = 280;
  const first = -sweep / 2;
  const positions = settings.map((_, position) => position);
  const step = sweep / Math.max(1, positions.length - 1);
  const index = Math.max(
    0,
    settings.findIndex((entry) => entry.key === setting),
  );
  const angleOf = (position: number) => (first + position * step + 360) % 360;
  const pointer = polar(centre, centre, knob - 1.5, angleOf(index));
  const steamFrom = settings.findIndex((entry) => entry.steam);
  const steamTo = settings.reduce((last, entry, at) => (entry.steam ? at : last), -1);

  return (
    // An Svg carries no intrinsic height in the layout, so without the style
    // it overflows whatever box it is centred in.
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: size, height: size }}
    >
      <Path
        d={arc(centre, centre, outer, angleOf(0), angleOf(0) + sweep)}
        stroke={off ? colour.hairline : colour.line}
        strokeWidth={1}
        fill="none"
      />
      {/* The steam band, spanning whichever positions the machine file marks. */}
      {!off && steamFrom >= 0 && (
        <Path
          d={arc(centre, centre, outer, angleOf(steamFrom), angleOf(steamTo))}
          stroke={colour.steam}
          strokeWidth={3}
          fill="none"
        />
      )}
      <G>
        {positions.map((position) => {
          const angle = angleOf(position);
          const selected = !off && position === index;
          const inner = polar(centre, centre, outer - (selected ? 9 : 5), angle);
          const edge = polar(centre, centre, outer + (selected ? 1.5 : 0), angle);
          return (
            <Line
              key={position}
              x1={inner.x}
              y1={inner.y}
              x2={edge.x}
              y2={edge.y}
              stroke={off ? colour.hairline : selected ? colour.accent : colour.faint}
              strokeWidth={selected ? 2 : 0.7}
            />
          );
        })}
      </G>
      <Circle
        cx={centre}
        cy={centre}
        r={knob}
        fill={off ? colour.panel : colour.knob}
        stroke={colour.line}
        strokeWidth={0.8}
      />
      {off ? (
        <G>
          <Circle
            cx={centre}
            cy={centre}
            r={outer - 6}
            stroke={colour.no}
            strokeWidth={1.6}
            fill="none"
          />
          <Line
            x1={polar(centre, centre, outer - 6, 225).x}
            y1={polar(centre, centre, outer - 6, 225).y}
            x2={polar(centre, centre, outer - 6, 45).x}
            y2={polar(centre, centre, outer - 6, 45).y}
            stroke={colour.no}
            strokeWidth={1.6}
          />
        </G>
      ) : (
        <G>
          <Line
            x1={centre}
            y1={centre}
            x2={pointer.x}
            y2={pointer.y}
            stroke={colour.accent}
            strokeWidth={2}
          />
          <Circle cx={centre} cy={centre} r={1.6} fill={colour.accent} />
        </G>
      )}
    </Svg>
  );
}

/**
 * A row of every value the machine offers with the one you want filled in —
 * the same shape as reading the setting off the display.
 */
export function ChipRow({
  label,
  values,
  selected,
  size = type.base,
}: {
  label: string;
  values: readonly string[];
  selected: readonly string[];
  size?: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 3 }}>
      <Text
        style={{
          fontFamily: font.sans,
          fontSize: size - 1.2,
          color: colour.muted,
          width: 58,
          // Keeps the label on the first line when the chips wrap onto a second.
          paddingTop: 1.8,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", flex: 1, gap: 2.5 }}>
        {values.map((value) => {
          const on = selected.includes(value);
          return (
            <Text
              key={value}
              style={{
                fontFamily: on ? font.bold : font.sans,
                fontSize: size,
                color: on ? colour.paper : colour.faint,
                backgroundColor: on ? colour.accent : colour.paper,
                borderWidth: space.ruleWidth,
                borderColor: on ? colour.accent : colour.hairline,
                borderRadius: space.xs,
                paddingVertical: 1.4,
                paddingHorizontal: 3.5,
              }}
            >
              {value}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

/** The full fascia for one pile: dial, display values and option buttons. */
export function ControlPanel({ item, dialSize = 76 }: { item: Instruction; dialSize?: number }) {
  const { washer } = useMachine();
  const position = washer.programs.indexOf(item.program);
  const off = washer.programs[0] ?? "";

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colour.panel,
        borderWidth: space.ruleWidth,
        borderColor: colour.hairline,
        borderRadius: space.sm,
        padding: space.base2,
        gap: space.lg,
      }}
    >
      <View style={{ alignItems: "center", width: dialSize }}>
        <ProgramDial program={item.program} size={dialSize} />
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: type.subtitle,
            color: colour.ink,
            textAlign: "center",
            marginTop: 2,
          }}
        >
          {item.program}
        </Text>
        <Text style={{ fontFamily: font.sans, fontSize: type.tiny, color: colour.muted }}>
          {position} clockwise from {off}
        </Text>
      </View>

      <View style={{ flex: 1, justifyContent: "center" }}>
        <ChipRow label="Temp" values={washer.temperatures} selected={[item.temperature]} />
        <ChipRow label="Spin rpm" values={washer.spins} selected={[item.spin]} />
        <ChipRow label="Buttons" values={washer.options} selected={item.options} size={type.chip} />
      </View>
    </View>
  );
}

/** The iron half of a card: dial plus what the setting means in words. */
export function IronPanel({ items, dialSize = 62 }: { items: Instruction[]; dialSize?: number }) {
  const machine = useMachine();
  const item = items[0] as Instruction;
  const setting = item.ironing ? ironSetting(machine, item.ironSetting) : undefined;

  return (
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
      <IronDial setting={item.ironSetting} off={!item.ironing} size={dialSize} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.bold, fontSize: type.emphasis, color: colour.ink }}>
          {setting ? `${setting.label} — ${setting.detail}` : "Do not iron"}
        </Text>
        {setting && (
          <Text style={{ fontFamily: font.sans, fontSize: type.small, color: colour.muted }}>
            {setting.steam ? "inside the steam zone" : "below the steam zone — dry iron only"}
          </Text>
        )}
        {/*
          Only the notes. The heading above has already said whether you iron
          this, so a line under it reading "Don't." is a line of nothing.
        */}
        <Prose
          items={items}
          pick={(entry) => entry.ironingNotes}
          size={type.prose}
          marginTop={2.5}
        />
      </View>
    </View>
  );
}

/**
 * A line of prose for a card. Where the piles sharing the card agree it reads
 * once; where they differ each pile is named, so a merged card never quietly
 * asserts one pile's advice over another's.
 */
function Prose({
  items,
  pick,
  size = type.body,
  marginTop = 0,
  emphasis = false,
}: {
  items: Instruction[];
  pick: (item: Instruction) => string;
  size?: number;
  marginTop?: number;
  emphasis?: boolean;
}) {
  const values = items.map(pick);
  const style = {
    fontFamily: emphasis ? font.bold : font.sans,
    fontSize: size,
    lineHeight: 1.35,
    color: emphasis ? colour.ink : colour.body,
    marginTop,
  } as const;

  // An empty Text still costs a line's height, which is a gap nobody asked for.
  if (values.every((value) => value === "")) return null;

  if (values.every((value) => value === values[0])) {
    return <Text style={style}>{values[0]}</Text>;
  }

  // A pile with nothing to say is left out rather than given its name and a
  // blank — the names are already in the card's heading.
  const speaking = items.filter((_, index) => values[index] !== "");

  return (
    <View style={{ marginTop }}>
      {speaking.map((item, index) => (
        <Text key={item.clothingType} style={{ ...style, marginTop: index === 0 ? 0 : 1.5 }}>
          <Text style={{ fontFamily: font.bold, color: colour.ink }}>{item.clothingType}: </Text>
          {pick(item)}
        </Text>
      ))}
    </View>
  );
}

/** A labelled block of prose that may differ between the piles on a card. */
export function SplitField({
  label,
  items,
  pick,
  emphasis = false,
}: {
  label: string;
  items: Instruction[];
  pick: (item: Instruction) => string;
  emphasis?: boolean;
}) {
  if (items.every((item) => pick(item) === "")) return null;

  return (
    <View style={{ marginTop: space.sm2 }}>
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: type.tiny,
          letterSpacing: 0.6,
          color: colour.muted,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Prose items={items} pick={pick} emphasis={emphasis} />
    </View>
  );
}

/** A labelled block of prose, used for detergent, drying and notes. */
export function Field({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={{ marginTop: space.sm2 }}>
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: type.tiny,
          letterSpacing: 0.6,
          color: colour.muted,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          fontFamily: emphasis ? font.bold : font.sans,
          fontSize: type.body,
          lineHeight: 1.35,
          color: emphasis ? colour.ink : colour.body,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/** Green tick / red cross for the fabric-softener column. */
export function SoftenerBadge({ on, size = type.subtitle }: { on: boolean; size?: number }) {
  return (
    <Text
      style={{
        fontFamily: font.bold,
        fontSize: size,
        color: colour.paper,
        backgroundColor: on ? colour.yes : colour.no,
        borderRadius: space.xs,
        paddingVertical: 1.4,
        paddingHorizontal: 4,
      }}
    >
      {on ? "SOFTENER OK" : "NO SOFTENER"}
    </Text>
  );
}
