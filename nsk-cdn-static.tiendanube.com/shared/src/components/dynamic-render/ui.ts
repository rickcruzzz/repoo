import { Fragment } from "@tiendanube/nube-sdk-react-runtime";
import { Icon } from "../../ui/Icon";
import {
	AccordionContent,
	AccordionHeader,
	AccordionItem,
	AccordionRoot,
} from "../../ui/accordion";
import { Box } from "../../ui/box/box";
import { Button } from "../../ui/button/button";
import { Check } from "../../ui/check/check";
import {
	ClipboardIndicator,
	ClipboardRoot,
	ClipboardTrigger,
} from "../../ui/clipboard";
import { Column } from "../../ui/column/column";
import { Field } from "../../ui/field";
import {
	FormCheckbox,
	FormFailure,
	FormField,
	FormFieldError,
	FormRadio,
	FormResetter,
	FormRoot,
	FormSelect,
	FormSending,
	FormSubmitter,
	FormSuccess,
} from "../../ui/form";
import { Iframe } from "../../ui/iframe/iframe";
import { Image } from "../../ui/image/image";
import { Link } from "../../ui/link/link";
import { Markdown } from "../../ui/markdown";
import { NumberField } from "../../ui/number-field/number-field";
import { PopoverButton, PopoverContent, PopoverRoot } from "../../ui/popover";
import { Progress } from "../../ui/progress/progress";
import { Row } from "../../ui/row/row";
import { Select } from "../../ui/select/select";
import { SideScroll } from "../../ui/side-scroll/side-scroll";
import { SvgCircle } from "../../ui/svg/svg-circle";
import { SvgClipPath } from "../../ui/svg/svg-clip-path";
import { SvgDefs } from "../../ui/svg/svg-defs";
import { SvgEllipse } from "../../ui/svg/svg-ellipse";
import { SvgFeGaussianBlur } from "../../ui/svg/svg-fe-gaussian-blur";
import { SvgFeMerge } from "../../ui/svg/svg-fe-merge";
import { SvgFeMergeNode } from "../../ui/svg/svg-fe-merge-node";
import { SvgFeOffset } from "../../ui/svg/svg-fe-offset";
import { SvgFilter } from "../../ui/svg/svg-filter";
import { SvgG } from "../../ui/svg/svg-g";
import { SvgLine } from "../../ui/svg/svg-line";
import { SvgLinearGradient } from "../../ui/svg/svg-linear-gradient";
import { SvgMask } from "../../ui/svg/svg-mask";
import { SvgPath } from "../../ui/svg/svg-path";
import { SvgPattern } from "../../ui/svg/svg-pattern";
import { SvgPolygon } from "../../ui/svg/svg-polygon";
import { SvgPolyline } from "../../ui/svg/svg-polyline";
import { SvgRadialGradient } from "../../ui/svg/svg-radial-gradient";
import { SvgRect } from "../../ui/svg/svg-rect";
import { SvgRoot } from "../../ui/svg/svg-root";
import { SvgStop } from "../../ui/svg/svg-stop";
import { SvgSymbol } from "../../ui/svg/svg-symbol";
import { SvgTSpan } from "../../ui/svg/svg-t-span";
import { SvgText } from "../../ui/svg/svg-text";
import { SvgUse } from "../../ui/svg/svg-use";
import {
	TableBody,
	TableCell,
	TableColumnHeaderCell,
	TableHeader,
	TableRoot,
	TableRow,
	TableRowHeaderCell,
} from "../../ui/table";
import { TextArea } from "../../ui/text-area";
import { Text } from "../../ui/text/text";
import { ToastDescription, ToastRoot, ToastTitle } from "../../ui/toast";
import { VideoStories } from "../../ui/video-stories/video-stories";
import { VideoPlayer } from "../../ui/video/video-player";
import { VideoRoot } from "../../ui/video/video-root";
import { VideoYouTube } from "../../ui/video/video-youtube";

export const ui = {
	accordionContent: AccordionContent,
	accordionHeader: AccordionHeader,
	accordionItem: AccordionItem,
	accordionRoot: AccordionRoot,
	box: Box,
	button: Button,
	clipboardRoot: ClipboardRoot,
	clipboardTrigger: ClipboardTrigger,
	clipboardIndicator: ClipboardIndicator,
	link: Link,
	markdown: Markdown,
	sidescroll: SideScroll,
	check: Check,
	col: Column,
	field: Field,
	formRoot: FormRoot,
	formField: FormField,
	formFieldError: FormFieldError,
	formSelect: FormSelect,
	formCheckbox: FormCheckbox,
	formRadio: FormRadio,
	formResetter: FormResetter,
	formSubmitter: FormSubmitter,
	formSuccess: FormSuccess,
	formFailure: FormFailure,
	formSending: FormSending,
	iframe: Iframe,
	numberfield: NumberField,
	fragment: Fragment,
	icon: Icon,
	img: Image,
	row: Row,
	select: Select,
	tableRoot: TableRoot,
	tableHeader: TableHeader,
	tableBody: TableBody,
	tableRow: TableRow,
	tableCell: TableCell,
	tableColumnHeaderCell: TableColumnHeaderCell,
	tableRowHeaderCell: TableRowHeaderCell,
	txt: Text,
	txtarea: TextArea,
	toastRoot: ToastRoot,
	toastTitle: ToastTitle,
	toastDescription: ToastDescription,
	popoverRoot: PopoverRoot,
	popoverButton: PopoverButton,
	popoverContent: PopoverContent,
	svgRoot: SvgRoot,
	svgPath: SvgPath,
	svgRect: SvgRect,
	svgCircle: SvgCircle,
	svgG: SvgG,
	svgLine: SvgLine,
	svgEllipse: SvgEllipse,
	svgPolygon: SvgPolygon,
	svgPolyline: SvgPolyline,
	svgText: SvgText,
	svgTSpan: SvgTSpan,
	svgDefs: SvgDefs,
	svgStop: SvgStop,
	svgLinearGradient: SvgLinearGradient,
	svgRadialGradient: SvgRadialGradient,
	svgMask: SvgMask,
	svgClipPath: SvgClipPath,
	svgUse: SvgUse,
	svgSymbol: SvgSymbol,
	svgPattern: SvgPattern,
	svgFilter: SvgFilter,
	svgFeGaussianBlur: SvgFeGaussianBlur,
	svgFeOffset: SvgFeOffset,
	svgFeMerge: SvgFeMerge,
	svgFeMergeNode: SvgFeMergeNode,
	progress: Progress,
	videoRoot: VideoRoot,
	videoPlayer: VideoPlayer,
	videoYouTube: VideoYouTube,
	videoStories: VideoStories,
} as const;

export type ComponentType = keyof typeof ui;
