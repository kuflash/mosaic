import { Component, EventEmitter, Host, HostBinding, Input, OnInit, Optional, Output } from '@angular/core';
import { toBoolean } from '@ptsecurity/mosaic/core';

import { McLayoutComponent } from './layout.component';


@Component({
    selector: 'mc-sidebar',
    preserveWhitespaces: false,
    templateUrl: './sidebar.component.html',
    host               : {
        '[class.mc-layout-sidebar]': 'true'
    }
})
export class McSidebarComponent implements OnInit {

    @Input() _mcWidth = 200;
    @Input() mcCollapsedWidth = 80;

    @Input()
    set mcCollapsible(value: boolean) {
        this.collapsible = toBoolean(value);
    }

    get mcCollapsible(): boolean {
        return this.collapsible;
    }

    @Input()
    @HostBinding('class.mc-layout-sidebar-collapsed')
    set mcCollapsed(value: boolean) {
        this.collapsed = toBoolean(value);
    }

    get mcCollapsed(): boolean {
        return this.collapsed;
    }

    @Output() mcCollapsedChange = new EventEmitter();

    private collapsed = false;
    private collapsible = false;

    @HostBinding('style.flex')
    get mcFlex(): string {
        if (this.mcCollapsed) {
            return `0 0 ${this.mcCollapsedWidth}px`;
        } else {
            return `0 0 ${this.mcWidth}px`;
        }
    }

    @HostBinding('style.max-width.px')
    @HostBinding('style.min-width.px')
    @HostBinding('style.width.px')
    get mcWidth(): number {
        if (this.mcCollapsed) {
            return this.mcCollapsedWidth;
        } else {
            return this._mcWidth;
        }
    }

    constructor(
        @Optional() @Host() private mcLayoutComponent: McLayoutComponent) {
    }

    ngOnInit(): void {
        if (this.mcLayoutComponent) {
            this.mcLayoutComponent.hasSidebar = true;
        }
    }
}
