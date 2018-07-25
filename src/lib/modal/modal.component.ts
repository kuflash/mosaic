import { DOCUMENT } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ComponentFactoryResolver,
    ComponentRef,
    ElementRef,
    EventEmitter,
    Inject,
    Injector,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    Renderer2,
    SimpleChanges,
    TemplateRef,
    Type,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import { Overlay, OverlayRef } from '@ptsecurity/cdk/overlay';
import { InputBoolean } from '@ptsecurity/mosaic/core';
import { Observable } from 'rxjs';

import { McMeasureScrollbarService } from '../core/services/measure-scrollbar.service';

import { McModalControlService } from './modal-control.service';
import { McModalRef } from './modal-ref.class';
// tslint:disable-next-line
import ModalUtil from './modal-util';
import { IModalButtonOptions, IModalOptions, ModalType, OnClickCallback } from './modal.type';


export const MODAL_ANIMATE_DURATION = 200; // Duration when perform animations (ms)


type AnimationState = 'enter' | 'leave' | null;

@Component({
    selector: 'mc-modal',
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.css']
})
export class McModalComponent<T = any, R = any> extends McModalRef<T, R>
    implements OnInit, OnChanges, AfterViewInit, OnDestroy, IModalOptions {

    // Observable alias for mcAfterOpen
    get afterOpen(): Observable<void> {
        return this.mcAfterOpen.asObservable();
    }

    // Observable alias for mcAfterClose
    get afterClose(): Observable<R> {
        return this.mcAfterClose.asObservable();
    }

    get okText(): string {
        return this.mcOkText;
    }

    get cancelText(): string {
        return this.mcCancelText;
    }

    // Indicate whether this dialog should hidden
    get hidden(): boolean {
        return !this.mcVisible && !this.animationState;
    }

    // tslint:disable-next-line:no-any
    @Input() mcModalType: ModalType = 'default';
    // If not specified, will use <ng-content>
    @Input() mcContent: string | TemplateRef<{}> | Type<T>;
    // avaliable when mcContent is a component
    @Input() mcComponentParams: object;
    // Default Modal ONLY
    @Input() mcFooter: string | TemplateRef<{}> | IModalButtonOptions<T>[];

    @Input() @InputBoolean() mcVisible: boolean = false;
    @Output() mcVisibleChange = new EventEmitter<boolean>();

    @Input() mcZIndex: number = 1000;
    @Input() mcWidth: number | string = 520;
    @Input() mcWrapClassName: string;
    @Input() mcClassName: string;
    @Input() mcStyle: object;
    @Input() mcTitle: string | TemplateRef<{}>;
    @Input() @InputBoolean() mcClosable: boolean = true;
    @Input() @InputBoolean() mcMask: boolean = true;
    @Input() @InputBoolean() mcMaskClosable: boolean = true;
    @Input() mcMaskStyle: object;
    @Input() mcBodyStyle: object;

    @Output() mcAfterOpen = new EventEmitter<void>(); // Trigger when modal open(visible) after animations
    @Output() mcAfterClose = new EventEmitter<R>(); // Trigger when modal leave-animation over

    // --- Predefined OK & Cancel buttons
    @Input() mcOkText: string;

    @Input() mcOkType = 'primary';
    @Input() @InputBoolean() mcOkLoading: boolean = false;
    @Input() @Output() mcOnOk: EventEmitter<T> | OnClickCallback<T> = new EventEmitter<T>();
    // Only aim to focus the ok button that needs to be auto focused
    @ViewChild('autoFocusButtonOk', {read: ElementRef}) autoFocusButtonOk: ElementRef;
    @Input() mcCancelText: string;

    @Input() @InputBoolean() mcCancelLoading: boolean = false;
    @Input() @Output() mcOnCancel: EventEmitter<T> | OnClickCallback<T> = new EventEmitter<T>();
    @ViewChild('modalContainer') modalContainer: ElementRef;
    @ViewChild('bodyContainer', {read: ViewContainerRef}) bodyContainer: ViewContainerRef;
    maskAnimationClassMap: object;
    modalAnimationClassMap: object;
    transformOrigin = '0px 0px 0px'; // The origin point that animation based on

    private contentComponentRef: ComponentRef<T>; // Handle the reference when using mcContent as Component
    private animationState: AnimationState; // Current animation state
    private container: HTMLElement | OverlayRef;

    constructor(
        private overlay: Overlay,
        private renderer: Renderer2,
        private cfr: ComponentFactoryResolver,
        private elementRef: ElementRef,
        private viewContainer: ViewContainerRef,
        private mcMeasureScrollbarService: McMeasureScrollbarService,
        private modalControl: McModalControlService,
        @Inject(DOCUMENT) private document: any) {

        super();
    }

    @Input() mcGetContainer: HTMLElement | OverlayRef | (() => HTMLElement | OverlayRef) = () => this.overlay.create();

    ngOnInit(): void {

        if (this.isComponent(this.mcContent)) {
            this.createDynamicComponent(this.mcContent as Type<T>); // Create component along without View
        }

        if (this.isModalButtons(this.mcFooter)) { // Setup default button options
            this.mcFooter = this.formatModalButtons(this.mcFooter as IModalButtonOptions<T>[]);
        }

        // Place the modal dom to elsewhere
        this.container = typeof this.mcGetContainer === 'function' ? this.mcGetContainer() : this.mcGetContainer;
        if (this.container instanceof HTMLElement) {
            this.container.appendChild(this.elementRef.nativeElement);
        } else if (this.container instanceof OverlayRef) {
            // NOTE: only attach the dom to overlay, the view container is not changed actually
            this.container.overlayElement.appendChild(this.elementRef.nativeElement);
        }

        // Register modal when afterOpen/afterClose is stable
        this.modalControl.registerModal(this);
    }

    // [NOTE] NOT available when using by service!
    // Because ngOnChanges never be called when using by service,
    // here we can't support "mcContent"(Component) etc. as inputs that initialized dynamically.
    // BUT: User also can change "mcContent" dynamically to trigger UI changes
    // (provided you don't use Component that needs initializations)
    ngOnChanges(changes: SimpleChanges): void {
        if (changes.mcVisible) {
            // Do not trigger animation while initializing
            this.handleVisibleStateChange(this.mcVisible, !changes.mcVisible.firstChange);
        }
    }

    ngAfterViewInit(): void {
        // If using Component, it is the time to attach View while bodyContainer is ready
        if (this.contentComponentRef) {
            this.bodyContainer.insert(this.contentComponentRef.hostView);
        }

        if (this.autoFocusButtonOk) {
            (this.autoFocusButtonOk.nativeElement as HTMLButtonElement).focus();
        }
    }

    ngOnDestroy(): void {
        if (this.container instanceof OverlayRef) {
            this.container.dispose();
        }
    }

    open(): void {
        this.changeVisibleFromInside(true);
    }

    close(result?: R): void {
        this.changeVisibleFromInside(false, result);
    }

    destroy(result?: R): void { // Destroy equals Close
        this.close(result);
    }

    triggerOk(): void {
        this.onClickOkCancel('ok');
    }

    triggerCancel(): void {
        this.onClickOkCancel('cancel');
    }

    getInstance(): McModalComponent {
        return this;
    }

    getContentComponentRef(): ComponentRef<T> {
        return this.contentComponentRef;
    }

    getContentComponent(): T {
        return this.contentComponentRef && this.contentComponentRef.instance;
    }

    getElement(): HTMLElement {
        return this.elementRef && this.elementRef.nativeElement;
    }

    onClickMask($event: MouseEvent): void {
        if (
            this.mcMask &&
            this.mcMaskClosable &&
            ($event.target as HTMLElement).classList.contains('mc-modal-wrap') &&
            this.mcVisible
        ) {
            this.onClickOkCancel('cancel');
        }
    }

    // tslint:disable-next-line
    isModalType(type: ModalType): boolean {
        return this.mcModalType === type;
    }

    // AoT
    onClickCloseBtn(): void {
        if (this.mcVisible) {
            this.onClickOkCancel('cancel');
        }
    }

    // AoT
    // tslint:disable-next-line
    onClickOkCancel(type: 'ok' | 'cancel'): void {
        const trigger = {ok: this.mcOnOk, cancel: this.mcOnCancel}[type];
        const loadingKey = {ok: 'mcOkLoading', cancel: 'mcCancelLoading'}[type];
        if (trigger instanceof EventEmitter) {
            trigger.emit(this.getContentComponent());
        } else if (typeof trigger === 'function') {
            const result = trigger(this.getContentComponent());
            // Users can return "false" to prevent closing by default
            const caseClose = (doClose: boolean | void | {}) => (doClose !== false) && this.close(doClose as R);
            if (isPromise(result)) {
                this[loadingKey] = true;
                const handleThen = (doClose) => {
                    this[loadingKey] = false;
                    caseClose(doClose);
                };
                (result as Promise<void>).then(handleThen).catch(handleThen);
            } else {
                caseClose(result);
            }
        }
    }

    // AoT
    isNonEmptyString(value: {}): boolean {
        return typeof value === 'string' && value !== '';
    }

    // AoT
    isTemplateRef(value: {}): boolean {
        return value instanceof TemplateRef;
    }

    // AoT
    isComponent(value: {}): boolean {
        return value instanceof Type;
    }

    // AoT
    isModalButtons(value: {}): boolean {
        return Array.isArray(value) && value.length > 0;
    }

    // Do rest things when visible state changed
    private handleVisibleStateChange(visible: boolean, animation: boolean = true, closeResult?: R): Promise<any> {
        if (visible) { // Hide scrollbar at the first time when shown up
            this.changeBodyOverflow(1);
        }

        return Promise
            .resolve(animation && this.animateTo(visible))
            .then(() => { // Emit open/close event after animations over
                if (visible) {
                    this.mcAfterOpen.emit();
                } else {
                    this.mcAfterClose.emit(closeResult);
                    this.changeBodyOverflow(); // Show/hide scrollbar when animation is over
                }
            });
    }

    // Lookup a button's property, if the prop is a function, call & then return the result, otherwise, return itself.
    // AoT
    // tslint:disable-next-line
    getButtonCallableProp(options: IModalButtonOptions<T>, prop: string): {} {
        const value = options[prop];
        const args: any[] = [];
        if (this.contentComponentRef) {
            args.push(this.contentComponentRef.instance);
        }

        return typeof value === 'function' ? value.apply(options, args) : value;
    }

    // On mcFooter's modal button click
    // AoT
    // tslint:disable-next-line
    onButtonClick(button: IModalButtonOptions<T>): void {
        const result = this.getButtonCallableProp(button, 'onClick'); // Call onClick directly
        if (isPromise(result)) {
            button.loading = true;
            (result as Promise<{}>).then(() => button.loading = false).catch(() => button.loading = false);
        }
    }

    // Change mcVisible from inside
    private changeVisibleFromInside(visible: boolean, closeResult?: R): Promise<void> {
        if (this.mcVisible !== visible) {
            // Change mcVisible value immediately
            this.mcVisible = visible;
            this.mcVisibleChange.emit(visible);

            return this.handleVisibleStateChange(visible, true, closeResult);
        }

        return Promise.resolve();
    }

    private changeAnimationState(state: AnimationState): void {
        this.animationState = state;
        if (state) {
            this.maskAnimationClassMap = {
                [`fade-${state}`]: true,
                [`fade-${state}-active`]: true
            };
            this.modalAnimationClassMap = {
                [`zoom-${state}`]: true,
                [`zoom-${state}-active`]: true
            };
        } else {
            // @ts-ignore
            this.maskAnimationClassMap = this.modalAnimationClassMap = null;
        }
    }

    private animateTo(isVisible: boolean): Promise<any> {
        if (isVisible) { // Figure out the lastest click position when shows up
            // [NOTE] Using timeout due to the document.click event is fired later than visible change,
            // so if not postponed to next event-loop, we can't get the lastest click position
            window.setTimeout(() => this.updateTransformOrigin());
        }

        this.changeAnimationState(isVisible ? 'enter' : 'leave');

        return new Promise((resolve) => window.setTimeout(() => { // Return when animation is over
            this.changeAnimationState(null);
            resolve();
        }, MODAL_ANIMATE_DURATION));
    }

    private formatModalButtons(buttons: IModalButtonOptions<T>[]): IModalButtonOptions<T>[] {
        return buttons.map((button) => {

            return {
                ...{
                    type: 'default',
                    size: 'default',
                    autoLoading: true,
                    show: true,
                    loading: false,
                    disabled: false
                },
                ...button
            };
        });
    }

    /**
     * Create a component dynamically but not attach to any View
     * (this action will be executed when bodyContainer is ready)
     * @param component Component class
     */
    private createDynamicComponent(component: Type<T>): void {
        const factory = this.cfr.resolveComponentFactory(component);
        const childInjector = Injector.create({
            providers: [{provide: McModalRef, useValue: this}],
            parent: this.viewContainer.parentInjector
        });
        this.contentComponentRef = factory.create(childInjector);
        if (this.mcComponentParams) {
            Object.assign(this.contentComponentRef.instance, this.mcComponentParams);
        }
        // Do the first change detection immediately
        // (or we do detection at ngAfterViewInit, multi-changes error will be thrown)
        this.contentComponentRef.changeDetectorRef.detectChanges();
    }

    // Update transform-origin to the last click position on document
    private updateTransformOrigin(): void {
        const modalElement = this.modalContainer.nativeElement as HTMLElement;
        const lastPosition = ModalUtil.getLastClickPosition();
        if (lastPosition) {
            // tslint:disable-next-line
            this.transformOrigin = `${lastPosition.x - modalElement.offsetLeft}px ${lastPosition.y - modalElement.offsetTop}px 0px`;
        }
    }

    /**
     * Take care of the body's overflow to decide the existense of scrollbar
     * @param plusNum The number that the openModals.length will increase soon
     */
    private changeBodyOverflow(plusNum: number = 0): void {
        const openModals = this.modalControl.openModals;

        if (openModals.length + plusNum > 0) {
            // tslint:disable-next-line
            this.renderer.setStyle(this.document.body, 'padding-right', `${this.mcMeasureScrollbarService.scrollBarWidth}px`);
            this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
        } else {
            this.renderer.removeStyle(this.document.body, 'padding-right');
            this.renderer.removeStyle(this.document.body, 'overflow');
        }
    }
}

////////////

function isPromise(obj: {} | void): boolean {
    // tslint:disable-next-line
    return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof (obj as Promise<{}>).then === 'function' && typeof (obj as Promise<{}>).catch === 'function';
}