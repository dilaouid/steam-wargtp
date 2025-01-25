export interface IGame {
    id: number;
    is_selectable: boolean;
}

export interface IGameActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isSelectable: boolean;
}
