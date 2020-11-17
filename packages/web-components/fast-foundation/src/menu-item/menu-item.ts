import { attr, DOM, FASTElement, observable } from "@microsoft/fast-element";
import {
    keyCodeArrowLeft,
    keyCodeArrowRight,
    keyCodeEnter,
    keyCodeSpace,
} from "@microsoft/fast-web-utilities";
import { StartEnd } from "../patterns/start-end";
import { applyMixins } from "../utilities/apply-mixins";
import { MenuItemRole } from "./menu-item.options";
import { AnchoredRegion } from "../anchored-region";
import { Menu } from "../menu/menu";

export { MenuItemRole };

/**
 * A Switch Custom HTML Element.
 * Implements {@link https://www.w3.org/TR/wai-aria-1.1/#menuitem | ARIA menuitem }, {@link https://www.w3.org/TR/wai-aria-1.1/#menuitemcheckbox | ARIA menuitemcheckbox}, or {@link https://www.w3.org/TR/wai-aria-1.1/#menuitemradio | ARIA menuitemradio }.
 *
 * @public
 */
export class MenuItem extends FASTElement {
    /**
     * The disabled state of the element.
     *
     * @public
     * @remarks
     * HTML Attribute: disabled
     */
    @attr({ mode: "boolean" })
    public disabled: boolean;

    /**
     * Whether the item opens a submenu.
     *
     * @public
     * @remarks
     * HTML Attribute: submenu
     */
    @attr({ mode: "boolean" })
    public submenu: boolean;

    /**
     * The expanded state of the element.
     *
     * @public
     * @remarks
     * HTML Attribute: expanded
     */
    @attr({ attribute: "expanded" })
    public expanded: boolean;
    private expandedChanged(oldValue: boolean): void {
        if (this.submenu && this.$fastController.isConnected && oldValue === true) {
            this.submenuNodes.forEach(element => {
                (element as Menu).collapseExpandedMenus();
            });
        }
    }

    /**
     * The role of the element.
     *
     * @public
     * @remarks
     * HTML Attribute: role
     */
    @attr
    public role: MenuItemRole = MenuItemRole.menuitem;

    /**
     * The checked value of the element.
     *
     * @public
     * @remarks
     * HTML Attribute: checked
     */
    @attr
    public checked: boolean;

    /**
     * reference to the anchored region
     *
     * @internal
     */
    public subMenuRegion: AnchoredRegion;

    /**
     * reference to the slotted submenu nodes
     *
     * @internal
     */
    @observable
    public submenuNodes: HTMLElement[] = [];

    /**
     * The current viewport element instance
     *
     * @internal
     */
    @observable
    public viewportElement: HTMLElement | null = null;
    private viewportElementChanged(): void {
        if (this.subMenuRegion !== null && this.subMenuRegion !== undefined) {
            this.subMenuRegion.viewportElement = this.viewportElement;
        }
    }

    /**
     * @internal
     */
    public handleMenuItemKeyDown = (e: KeyboardEvent): boolean => {
        if (e.defaultPrevented) {
            return false;
        }

        switch (e.keyCode) {
            case keyCodeEnter:
            case keyCodeSpace:
                this.invoke();
                return false;

            case keyCodeArrowRight:
                //open/focus on submenu
                if (this.submenu) {
                    this.invoke();
                }
                return false;

            case keyCodeArrowLeft:
                //close submenu
                if (this.submenu) {
                    this.expanded = false;
                    this.focus();
                    return false;
                }
        }

        return true;
    };

    /**
     * @internal
     */
    public handleMenuItemClick = (e: MouseEvent): boolean => {
        if (e.defaultPrevented || this.disabled) {
            return false;
        }

        this.invoke();
        return false;
    };

    /**
     * @internal
     */
    public handleAnchoredRegionChange = (e: Event): boolean => {
        if (e.defaultPrevented || this.disabled || this.submenuNodes.length === 0) {
            return false;
        }

        this.subMenuRegion.removeEventListener("change", this.handleAnchoredRegionChange);

        DOM.queueUpdate(() => {
            this.setAttribute("tabindex", "-1");
            this.submenuNodes[0].focus();
        });

        return false;
    };

    private invoke = (): void => {
        if (this.disabled) {
            return;
        }

        switch (this.role) {
            case MenuItemRole.menuitemcheckbox:
            case MenuItemRole.menuitemradio:
                this.checked = !this.checked;
                this.$emit("change");
                break;

            case MenuItemRole.menuitem:
                if (this.submenu) {
                    this.expanded = !this.expanded;
                    if (this.expanded) {
                        DOM.queueUpdate(this.setRegionProps);
                    }
                    this.$emit("expanded-change");
                } else {
                    this.$emit("change");
                }
                break;
        }
    };

    /**
     * updates the anchored region props after it has been
     * added to the DOM
     */
    private setRegionProps = (): void => {
        if (!this.expanded) {
            return;
        }
        this.viewportElement = document.body;
        this.subMenuRegion.viewportElement = this.viewportElement;
        this.subMenuRegion.anchorElement = this as any;
        this.subMenuRegion.addEventListener("change", this.handleAnchoredRegionChange);
    };
}

/**
 * Mark internal because exporting class and interface of the same name
 * confuses API documenter.
 * TODO: https://github.com/microsoft/fast/issues/3317
 * @internal
 */
/* eslint-disable-next-line */
export interface MenuItem extends StartEnd {}
applyMixins(MenuItem, StartEnd);
