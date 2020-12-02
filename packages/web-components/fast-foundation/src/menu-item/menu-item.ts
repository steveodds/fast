import { attr, DOM, FASTElement, observable } from "@microsoft/fast-element";
import {
    Direction,
    keyCodeArrowLeft,
    keyCodeArrowRight,
    keyCodeEnter,
    keyCodeSpace,
} from "@microsoft/fast-web-utilities";
import { StartEnd } from "../patterns/start-end";
import { applyMixins } from "../utilities/apply-mixins";
import { AnchoredRegion } from "../anchored-region";
import { Menu } from "../menu/menu";
import { getDirection } from "../utilities/";
import { MenuItemRole } from "./menu-item.options";

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
     * The expanded state of the element.
     *
     * @public
     * @remarks
     * HTML Attribute: expanded
     */
    @attr({ attribute: "expanded" })
    public expanded: boolean;
    private expandedChanged(oldValue: boolean): void {
        if (this.submenuElements.length > 0 && this.$fastController.isConnected) {
            if (this.expanded === false) {
                this.submenuElements.forEach(element => {
                    (element as Menu).collapseExpandedItem();
                });
            } else {
                this.currentDirection = getDirection(this);
            }
            this.$emit("expanded-change", this, { bubbles: false });
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
    public submenuElements: HTMLElement[];

    /**
     * Track current direction to pass to the anchored region
     *
     * @internal
     */
    @observable
    public currentDirection: Direction = Direction.ltr;

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
                if (this.submenuElements.length > 0) {
                    this.toggleExpanded();
                }
                return false;

            case keyCodeArrowLeft:
                //close submenu
                if (this.expanded) {
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
    public handleAnchoredRegionChange = (e: Event): void => {
        if (e.defaultPrevented || this.disabled || this.submenuElements.length === 0) {
            return;
        }

        e.preventDefault();

        this.subMenuRegion.removeEventListener(
            "positionchange",
            this.handleAnchoredRegionChange
        );

        DOM.queueUpdate(() => {
            this.setAttribute("tabindex", "-1");
            if (this.submenuElements.length > 0) {
                this.submenuElements[0].focus();
            }
        });
    };

    private toggleExpanded = (): void => {
        if (this.submenuElements.length === 0) {
            return;
        }
        this.expanded = !this.expanded;
        if (this.expanded) {
            DOM.queueUpdate(this.setRegionProps);
        }
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
                if (this.submenuElements.length > 0) {
                    this.toggleExpanded();
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
        this.subMenuRegion.addEventListener(
            "positionchange",
            this.handleAnchoredRegionChange
        );
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
