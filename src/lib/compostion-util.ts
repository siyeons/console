import {
    computed, onUnmounted, reactive, ref, onMounted, getCurrentInstance, Ref,
} from '@vue/composition-api';
import _ from 'lodash';
import moment from 'moment-timezone';
import VueI18n from 'vue-i18n';
import { isNotEmpty } from '@/lib/util';

/**
 * make proxy computed that same name as props
 * @param name
 * @param props
 * @param emit
 * @return {Ref<*>}
 */
/* eslint-disable arrow-parens */
export const makeProxy = <T extends any>(name: string, props: any = null, emit: any = null): Ref<T> => {
    let _props = props;
    let _emit = emit;
    if (!_props && !_emit) {
        const vm = getCurrentInstance();
        if (vm) {
            _props = vm.$props;
            _emit = vm.$listeners[`update:${name}`];
        } else {
            console.error('unsupported get current instance method');
        }
    }
    return computed({
        get: () => _props[name],
        set: val => {
            if (emit) {
                emit(`update:${name}`, val);
            } else {
                _emit(val);
            }
        },
    });
};

export const makeVModelProxy = <T extends any>(name = 'value', event = 'input', transform: ((val: any) => any)|null = null): Ref<T> => {
    const vm = getCurrentInstance();
    let setter: (val: any) => void;
    if (transform) {
        setter = val => { vm?.$emit(event, transform(val)); };
    } else {
        setter = val => { vm?.$emit(event, val); };
    }

    return computed({
        get: () => vm?.$props[name],
        set: setter,
    });
};

/**
 * event by pass
 * @param emit
 * @param name
 * @return {function(...[*]=)}
 */
export const makeByPass = (emit: any, name: string) => (...event: any) => {
    emit(name, ...event);
};

/**
 * auto mount&unmount event on bus
 * @param bus page event bus
 * @param eventName
 * @param handler
 */
export const mountBusEvent = (bus: any, eventName: string, handler: Function) => {
    bus.$on(eventName, handler);
    onUnmounted(() => bus.$off(eventName, handler));
};

/**
 * 여러 엘리먼트에서 마우스 오버 여부 추적에 필요한 함수 모음
 * @param disabled
 * @return {{onMouseOut: onMouseOut, isMouseOver: Ref<HasDefined<S> extends true ? S : RefValue<T>>, onMouseOver: onMouseOver}}
 */
export const mouseOverState = (disabled?: boolean) => {
    const disable = disabled || false;
    const isMouseOver = ref(false);
    const onMouseOver = () => {
        if (!disable && !isMouseOver.value) {
            isMouseOver.value = true;
        }
    };
    const onMouseOut = () => {
        if (!disable && isMouseOver.value) {
            isMouseOver.value = false;
        }
    };
    return {
        isMouseOver,
        onMouseOver,
        onMouseOut,
    };
};

/**
 * 윈도우 이벤트 등록 함수
 * 자동완성, 드롭다운 컨텍스트 메뉴 팝업을 자동으로 닫게 할때 활용
 * @param eventName
 * @param func
 */
export const windowEventMount = (eventName: string, func: any) => {
    onMounted(() => window.addEventListener(eventName, func));
    onUnmounted(() => window.removeEventListener(eventName, func));
};
/**
 * Document 이벤트 등록 함수
 * 자동완성, 드롭다운 컨텍스트 메뉴 팝업을 자동으로 닫게 할때 활용
 * @param eventName
 * @param func
 */
export const documentEventMount = (eventName: string, func: any) => {
    onMounted(() => document.addEventListener(eventName, func));
    onUnmounted(() => document.removeEventListener(eventName, func));
};
type validationFunction = (value: any, data?: any, options?: any) => boolean|Promise<boolean>;
type message = string|VueI18n.TranslateResult;

export class Validation {
    /**
     * make new validation
     * @param func validation func, if invalid return false
     * @param invalidMessage
     */
    constructor(public func: validationFunction, public invalidMessage?: message) { }
}

/**
 * add form validation process
 * @param data  reactive data
 * @param validation validation functions
 * @return {
 *          {
 *          allValidation: (function(): boolean),
 *          validState: UnwrapRef<any>,
 *          fieldValidation: fieldValidation,
 *          invalidMsg: UnwrapRef<any>,
 *          invalidState: Ref<any>
 *          }
 *      }
 */
export const formValidation = (data: any, validation: object) => {
    const validationFields = Object.keys(validation);
    const invalidMsg = reactive(Object.fromEntries(validationFields.map(x => [x, ''])));
    const invalidState = reactive(Object.fromEntries(validationFields.map(x => [x, false])));
    const validState = reactive(Object.fromEntries(validationFields.map(x => [x, false])));
    const isAllValid = computed(() => _.every(invalidState, val => val === false));
    /**
     * validated only one field
     * @param name
     * @return {boolean}
     */
    const fieldValidation = async (name: string) => {
        const vds = validation[name];
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < vds.length; i++) {
            const vd = vds[i];
            // eslint-disable-next-line no-await-in-loop
            const check = await vd.func(data[name], data);
            if (!check) {
                invalidMsg[name] = vd.invalidMessage;
                invalidState[name] = true;
                return false;
            }
        }
        invalidState[name] = false;
        validState[name] = true;
        return true;
    };
    /**
     * validated all fields
     * @return {boolean}
     */
    const allValidation = async () => {
        let result = true;
        const vds = Object.keys(validation);
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < vds.length; i++) {
            // eslint-disable-next-line no-await-in-loop
            const validateResult = await fieldValidation(vds[i]);
            if (!validateResult) {
                result = false;
            }
        }
        return result;
    };
    return {
        fieldValidation,
        allValidation,
        invalidMsg,
        invalidState,
        validState,
        isAllValid,
    };
};

export const requiredValidation = (invalidMessage?: message) => new Validation(value => isNotEmpty(value), invalidMessage || 'Required field!');
// eslint-disable-next-line max-len
export const noEmptySpaceValidation = (invalidMessage?: message) => new Validation((value: string) => isNotEmpty(value) && value.trim().length === value.length, invalidMessage || 'You Must Remove Empty Space');


export const jsonParseValidation = (invalidMessage: message) => new Validation((value) => {
    try {
        if (value[0] !== '{' && value[value.length - 1] !== '}') return false;
        JSON.parse(value);
    } catch (e) {
        return false;
    }
    return true;
},
invalidMessage || 'Invalid Json string format!');
export const numberMinValidation = (min: number, invalidMessage?: message) => new Validation(value => (value ? Number(value) >= min : true), invalidMessage || `value must bigger then ${min}`);
export const numberMaxValidation = (max: number, invalidMessage?: message) => new Validation(value => (value ? Number(value) <= max : true), invalidMessage || `value must smaller then ${max}`);
export const lengthMinValidation = (min: number, invalidMessage?: message) => new Validation(value => (value ? value.length >= min : true), invalidMessage || `value length must bigger then ${min}`);
export const lengthMaxValidation = (max: number, invalidMessage?: message) => new Validation(value => (value ? value.length <= max : true), invalidMessage || `value length must smaller then ${max}`);
export const checkTimeZoneValidation = (invalidMessage: message) => new Validation(value => (value ? moment.tz.names().indexOf(value) !== -1 : true), invalidMessage || 'can not find timezone');

export const credentialsNameValidation = (parent: any, invalidMessage: message) => new Validation(async (value) => {
    let result = false;
    await parent.$http.post('/secret/secret/list', { name: value, domain_id: parent.$ls.domain.state.domainId }).then((res) => {
        if (res.data.total_count === 0) {
            result = true;
        }
    }).catch((error) => {
        console.error(error);
    });
    return result;
}, invalidMessage || 'same name exists!');

export const userIDValidation = (parent: any, invalidMessage: message) => new Validation(async (value) => {
    let result = false;
    // eslint-disable-next-line camelcase
    await parent.$http.post('/identity/user/get', { user_id: value }).catch((error) => {
        if (error.response.data.error.code === 'ERROR_NOT_FOUND') {
            result = true;
        }
    });
    return result;
}, invalidMessage || 'same ID exists!');

interface TabState {
    activeTab: Ref<string>;
    activeMultiTab: Ref<string>;
}
