import { Fragment, h } from "preact";
import { memo } from "preact/compat";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "preact/hooks";
import type { Runtime } from "./types";

const createElement = h;

export const runtime: Runtime = {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
	createElement,
	Fragment,
	memo,
};

export {
	useState,
	useEffect,
	useRef,
	useMemo,
	useCallback,
	createElement,
	Fragment,
	memo,
};
