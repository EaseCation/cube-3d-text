import React, { useState, useEffect } from 'react';
import { Input, Flex, Typography, theme as antdTheme } from 'antd';
import { useLanguage } from '../language';

const { Text } = Typography;
type Axis = 'x' | 'y' | 'z';

interface Position3DControlProps {
    x: number;
    y: number;
    z: number;
    onPositionChange: (position: { x: number; y: number; z: number }) => void;
    xRange?: [number, number];
    yRange?: [number, number];
    zRange?: [number, number];
    step?: number;
    disabled?: boolean;
}

// 可拖拽的数值前缀组件
const DraggablePrefix: React.FC<{
    label: string;
    color: string;
    value: number;
    range: [number, number];
    step: number;
    disabled: boolean;
    onValueChange: (value: number) => void;
}> = ({ label, color, value, range, step, disabled, onValueChange }) => {
    const { gLang } = useLanguage();
    const { token } = antdTheme.useToken();
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartValue, setDragStartValue] = useState(0);
    const [dragStartY, setDragStartY] = useState(0);

    const handleMouseDown = (event: React.MouseEvent) => {
        if (disabled) return;

        event.preventDefault();
        setIsDragging(true);
        setDragStartValue(value);
        setDragStartY(event.clientY);
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    };

    const handleTouchStart = (event: React.TouchEvent) => {
        if (disabled) return;

        event.preventDefault();
        event.stopPropagation(); // 防止触发页面滚动
        setIsDragging(true);
        setDragStartValue(value);
        setDragStartY(event.touches[0].clientY);
        document.body.style.userSelect = 'none';

        // 防止页面滚动
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';

        // 添加触觉反馈（如果支持）
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    };

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!isDragging) return;

            const deltaY = dragStartY - event.clientY;
            const sensitivity = 0.1;
            const deltaValue = deltaY * sensitivity;
            const newValue = dragStartValue + deltaValue;

            const clampedValue = Math.max(range[0], Math.min(range[1], newValue));
            const roundedValue = Math.round(clampedValue / step) * step;

            onValueChange(roundedValue);
        };

        const handleTouchMove = (event: TouchEvent) => {
            if (!isDragging) return;

            event.preventDefault(); // 防止页面滚动
            const deltaY = dragStartY - event.touches[0].clientY;
            const sensitivity = 0.1;
            const deltaValue = deltaY * sensitivity;
            const newValue = dragStartValue + deltaValue;

            const clampedValue = Math.max(range[0], Math.min(range[1], newValue));
            const roundedValue = Math.round(clampedValue / step) * step;

            onValueChange(roundedValue);
        };

        const handleEnd = () => {
            setIsDragging(false);
            document.body.style.cursor = 'auto';
            document.body.style.userSelect = 'auto';

            // 恢复页面滚动
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, dragStartValue, dragStartY, value, range, step, onValueChange]);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                cursor: disabled ? 'default' : 'ns-resize',
                padding: '6px 4px',
                marginLeft: '-4px',
                minWidth: '20px',
                justifyContent: 'center',
                borderRadius: '2px',
                backgroundColor: isDragging ? 'var(--drag-background)' : 'transparent',
                userSelect: 'none'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            title={gLang('dragToAdjust', { label })}
        >
            <Text
                style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: disabled ? token.colorTextDisabled : color,
                    lineHeight: 1
                }}
            >
                {label}
            </Text>
        </div>
    );
};

const Position3DControl: React.FC<Position3DControlProps> = ({
    x,
    y,
    z,
    onPositionChange,
    xRange = [-50, 50],
    yRange = [-20, 20],
    zRange = [-20, 20],
    step = 0.1,
    disabled = false,
}) => {
    const formatNum = (n: number) => n.toFixed(1);
    // 只保存编辑中的草稿；非编辑状态直接显示外部值，避免派生状态失步。
    const [inputDrafts, setInputDrafts] = useState<Partial<Record<Axis, string>>>({});
    const displayedValue = (axis: Axis) => {
        const values = { x, y, z };
        return inputDrafts[axis] ?? formatNum(values[axis]);
    };

    // 仅允许 数字/负号/点，负号只能在开头，点只能出现一次（但允许结尾处点作为临时态）
    const allowedPartial = /^-?\d*(\.\d*)?$/;
    // 完整数字，用于提交（不以点结尾，不是空或仅负号）
    const completeNumber = /^-?\d+(?:\.\d+)?$/;

    const handleInputChange = (axis: Axis, raw: string) => {
        if (disabled) return;
        if (!allowedPartial.test(raw)) {
            // 拒绝包含非法字符的输入
            return;
        }

        setInputDrafts((drafts) => ({ ...drafts, [axis]: raw }));

        // 若是完整数字，立刻提交变化
        if (completeNumber.test(raw)) {
            const numValue = parseFloat(raw);
            const next = { x, y, z } as { x: number; y: number; z: number };
            next[axis] = numValue;
            onPositionChange(next);
        }
    };

    const handleBlur = (axis: Axis) => {
        const raw = displayedValue(axis);

        if (completeNumber.test(raw)) {
            const next = { x, y, z } as { x: number; y: number; z: number };
            next[axis] = parseFloat(raw);
            onPositionChange(next);
        }

        setInputDrafts((drafts) => {
            const nextDrafts = { ...drafts };
            delete nextDrafts[axis];
            return nextDrafts;
        });
    };

    return (
        <Flex gap="small" align="center">
            {/* X 轴控制 */}
            <Input
                value={displayedValue('x')}
                disabled={disabled}
                onChange={(e) => handleInputChange('x', e.target.value)}
                onFocus={() => setInputDrafts((drafts) => ({
                    ...drafts,
                    x: drafts.x ?? formatNum(x),
                }))}
                onBlur={() => handleBlur('x')}
                style={{ flex: 1 }}
                prefix={
                    <DraggablePrefix
                        label="X"
                        color="#ff4d4f"
                        value={x}
                        range={xRange}
                        step={step}
                        disabled={disabled}
                        onValueChange={(value) => {
                            setInputDrafts((drafts) => ({ ...drafts, x: formatNum(value) }));
                            onPositionChange({ x: value, y, z });
                        }}
                    />
                }
            />

            {/* Y 轴控制 */}
            <Input
                value={displayedValue('y')}
                disabled={disabled}
                onChange={(e) => handleInputChange('y', e.target.value)}
                onFocus={() => setInputDrafts((drafts) => ({
                    ...drafts,
                    y: drafts.y ?? formatNum(y),
                }))}
                onBlur={() => handleBlur('y')}
                style={{ flex: 1 }}
                prefix={
                    <DraggablePrefix
                        label="Y"
                        color="#52c41a"
                        value={y}
                        range={yRange}
                        step={step}
                        disabled={disabled}
                        onValueChange={(value) => {
                            setInputDrafts((drafts) => ({ ...drafts, y: formatNum(value) }));
                            onPositionChange({ x, y: value, z });
                        }}
                    />
                }
            />

            {/* Z 轴控制 */}
            <Input
                value={displayedValue('z')}
                disabled={disabled}
                onChange={(e) => handleInputChange('z', e.target.value)}
                onFocus={() => setInputDrafts((drafts) => ({
                    ...drafts,
                    z: drafts.z ?? formatNum(z),
                }))}
                onBlur={() => handleBlur('z')}
                style={{ flex: 1 }}
                prefix={
                    <DraggablePrefix
                        label="Z"
                        color="#1890ff"
                        value={z}
                        range={zRange}
                        step={step}
                        disabled={disabled}
                        onValueChange={(value) => {
                            setInputDrafts((drafts) => ({ ...drafts, z: formatNum(value) }));
                            onPositionChange({ x, y, z: value });
                        }}
                    />
                }
            />
        </Flex>
    );
};

export default Position3DControl;
