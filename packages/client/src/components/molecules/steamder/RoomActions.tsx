import styled from "styled-components";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Row, Col, Button } from "react-bootstrap";

import { useSteamderStore } from "../../../store/steamderStore";
import { useAuthStore } from "../../../store/authStore";
import { useLeaveSteamder } from "../../../hooks/useLeaveSteamder";

import { IPlayer } from "../../../types/ISteamder";

const StyledRow = styled(Row)`
    height: 91px;
`;

export const RoomActions: React.FC = () => {
    const { t } = useTranslation("pages/steamder", { keyPrefix: "waitlist.actions" });
    const { steamder, setSteamder } = useSteamderStore();
    const { user, setUser } = useAuthStore();
    const navigate = useNavigate();
    const leaveMutation = useLeaveSteamder();

    const [loading, setLoading] = useState(false);

    if (!steamder) return null;

    const admin: IPlayer = steamder.players?.find(p => p.player_id == steamder.admin_id) as IPlayer;
    const isAdmin = admin?.player_id == user?.id;

    const handleLeave = () => {
        setLoading(true);
        leaveMutation.mutateAsync(steamder.id).then(() => {
            if (!user) return;
            setUser({ ...user, waitlist: null });
            setSteamder(null);
        }).finally(() => {
            setLoading(false)
            navigate({ to: "/steamders" });
        });
    };

    return (
        <StyledRow className="justify-content-center">
            { isAdmin && <Col sm={"auto"} className="align-self-center">
                <Button variant="outline-info" className="shadow" disabled={
                    steamder.players?.length < 2 || (steamder.display_all_games && steamder.all_games == 0) || (!steamder.display_all_games && steamder.common_games == 0)
                }>{t('start')}</Button>
            </Col> }
            <Col sm={"auto"} className="align-self-center">
                <Button variant="outline-danger" className="shadow" onClick={handleLeave} disabled={loading}>{t('leave')}</Button>
            </Col>
        </StyledRow>
    );
};