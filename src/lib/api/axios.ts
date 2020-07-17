import axios, {
    AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse,
} from 'axios';
import createAuthRefreshInterceptor from 'axios-auth-refresh';
import config from '@/lib/config';
import { setMockData } from '@/lib/mock';
import { dataTableProps } from '@/components/organisms/tables/data-table/DataTable.toolset';

const MockAdapter = require('axios-mock-adapter');


class APIError extends Error {
    status: number;

    code: string;

    axiosError: AxiosError;

    constructor(axiosError: AxiosError) {
        super();

        // @ts-ignore
        if (Error.captureStackTrace) {
            // @ts-ignore
            Error.captureStackTrace(this, APIError);
        }

        this.name = 'APIError';
        this.status = 500;
        this.code = 'ERROR_UNKNOWN';
        this.axiosError = axiosError;

        if (axiosError.response) {
            this.status = axiosError.response.status;

            if (axiosError.response.data.error) {
                this.message = axiosError.response.data.error.message;
                this.code = axiosError.response.data.error.code;
            } else {
                this.message = axiosError.response.statusText;
            }
        } else {
            this.message = axiosError.message;
        }
    }
}


const refreshUrl = '/identity/token/refresh';

export class API {
    instance: AxiosInstance ;

    protected refreshInstance: AxiosInstance ;

    protected axiosOptions: any;

    private vm: any;

    newInstance() {
        const instance = axios.create(this.axiosOptions);
        if (config.get('NO_SERVER_MODE')) {
            console.warn('YOU ARE USE NO SERVER MODE!!!!!');
            setMockData(instance);
        }
        return instance;
    }

    constructor() {
        this.instance = axios.create();
        this.refreshInstance = axios.create();
        this.vm = null;
    }


    init(baseURL: string, vm: any) {
        this.axiosOptions = {
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        this.vm = vm;
        this.instance = this.newInstance();
        this.refreshInstance = this.newInstance();

        this.setRefreshRequestInterceptor((request) => {
            if (this.vm.$ls.user.state.isSignedIn) {
                request.headers.Authorization = `Bearer ${this.vm.$ls.user.state.refreshToken}`;
            }
            return request;
        });
        this.setRequestInterceptor((request) => {
            if (this.vm.$ls.user.state.isSignedIn) {
                request.headers.Authorization = `Bearer ${this.vm.$ls.user.state.accessToken}`;
                if (request.method?.toUpperCase() === 'POST' && !!request.data) {
                    if (typeof request.data === 'string') {
                        try {
                            const data = JSON.parse(request.data);
                            data.domain_id = this.vm.$ls.domain.state.domainId;
                            request.data = JSON.stringify(data);
                        } catch (e) {
                            console.error(e);
                        }
                    } else {
                        request.data.domain_id = this.vm.$ls.domain.state.domainId;
                    }
                }
            }
            return request;
        });
        const refreshAuthLogic = failedRequest => this.refreshInstance.post(refreshUrl).then((resp) => {
            // console.debug('request refresh token');
            this.vm.$ls.user.setToken(resp.data.refresh_token, resp.data.access_token);
            failedRequest.response.config.headers.Authorization = `Bearer ${this.vm.$ls.user.state.accessToken}`;
            return Promise.resolve();
        }, (error) => {
            this.vm.$ls.logout(vm);
            return Promise.reject(error);
        });

        createAuthRefreshInterceptor(this.instance, refreshAuthLogic, { skipWhileRefreshing: false });

        return this.instance;
    }

    protected setRefreshRequestInterceptor(handler: (request: AxiosRequestConfig) => AxiosRequestConfig): void {
        this.refreshInstance.interceptors.request.use(handler);
    }

    protected setRequestInterceptor(handler: (request: AxiosRequestConfig) => AxiosRequestConfig): void {
        this.instance.interceptors.request.use(handler);
    }

    protected setResponseInterceptor(responseHandler: (response: AxiosResponse) => AxiosResponse|Promise<AxiosResponse>, errorHandler?: (error: AxiosError) => AxiosError|Promise<AxiosError>): void {
        this.instance.interceptors.response.use(responseHandler, errorHandler);
    }
}
// DO NOT USE THIS IN CONFIG REQUEST
export const api: API = new API();
