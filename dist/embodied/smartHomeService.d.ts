export type SmartDeviceType = 'desk_light' | 'main_light' | 'air_conditioner' | 'smart_plug' | 'fan';
export type SmartActionType = 'turn_on' | 'turn_off' | 'set_temperature' | 'set_brightness' | 'get_status';
export interface SmartHomeCommandOptions {
    device: SmartDeviceType | string;
    action: SmartActionType;
    value?: number;
}
export interface SmartHomeDeviceState {
    id: string;
    name: string;
    type: SmartDeviceType;
    power: 'ON' | 'OFF';
    temperature?: number;
    brightness?: number;
    lastUpdated: string;
}
export interface SmartHomeActionResult {
    success: boolean;
    device: string;
    action: string;
    state: SmartHomeDeviceState;
    message: string;
}
export declare class SmartHomeService {
    private devices;
    constructor();
    getAllDevices(): SmartHomeDeviceState[];
    executeCommand(options: SmartHomeCommandOptions): Promise<SmartHomeActionResult>;
}
export declare const smartHomeService: SmartHomeService;
