import styled from "styled-components";

import { GameCard } from "../../molecules/homepage/GameCard";
import { Col, Row } from "react-bootstrap";
import { Trans, useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

const StyledPodium = styled.div`
  text-align: center;
  margin-top: 30px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
`;

export const Podium: React.FC = () => {
    const { t } = useTranslation('pages/homepage', { keyPrefix: 'podium' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: statsData, isPending } = useQuery<any>({
        queryKey: ['stats'],
        select: (data) => data.data
    });

    return (
        <>
            <Row className="mb-5" data-aos="zoom-out">
                <Col md={8} xl={6} className="text-center mx-auto">
                    <h2>{ t('title') }</h2>
                    <p className="w-lg-50">
                        <Trans t={t} i18nKey="content" components={{ 1: <strong  className="text-info"/> }} />
                    </p>
                </Col>
             </Row>
            <StyledPodium data-aos="zoom-out" data-aos-duration="800">
                {/* Second place */}
                { <GameCard size="small" color="silver" score={isPending ? null : statsData?.podium[1]} /> }
                
                {/* First place */}
                { <GameCard size="large" color="gold" score={isPending ? null : statsData?.podium[0]} /> }
                
                {/* Third place */}
                { <GameCard size="small" color="#cd7f32" score={isPending ? null : statsData?.podium[2]} /> }
            </StyledPodium>
            <hr />
        </>
    )
};